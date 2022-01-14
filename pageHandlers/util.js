var AWS = require('aws-sdk');
const axios = require("axios")

const redis = require("redis");
const client = redis.createClient({url: process.env.REDIS_URL});

async function title(page) {
	const result = await page.title()
	return result
}

const bottomOut = (page, lastHeight) => {
  return page.evaluate(() => {
    const currentHeight = Array.from(document.querySelectorAll('*'))
      .reduce((max, el) => el.offsetHeight > max ? el.offsetHeight : max, -1)
    window.scroll({top: currentHeight, behavior: 'smooth'})
    return currentHeight
  } 
    )
    //baseCase: height has not changed
    .then(h => page.title().then(t => console.log(`bottomOut ${t} last height: ${lastHeight}`, h) || h))
    .then(currentHeight => lastHeight >= currentHeight ? page :
      page.waitFor(3000).then(r => bottomOut(page, currentHeight))
    )
}

const largestImage = async (page) => await page.evaluate(() => {
	//images whose url includes the word lineup
	const namedLineups = document.querySelectorAll('img[src*=lineup]')
	//images that are within an element whose id or class includes the word lineup
	const lineupImages = namedLineups.length ? namedLineups : document.querySelectorAll('[id*=lineup i] img, [class*=lineup i] img')
	//all images on the page
	const images = [...(lineupImages.length ? lineupImages : document.getElementsByTagName('img'))]
		.filter(i => i.src.indexOf('gradient') < 0)
		.filter(i => i.src.indexOf('footer') < 0)
	const img = images.sort((a, b) => b.width * b.height - a.width * a.height)[0];
	return [images.length, img.src, img.width * img.height, lineupImages.length]
});

const classedObjects = async page => await page.evaluate(() => {
	return Array.from(document.querySelectorAll('[class]'))
        .filter(el => el.textContent && /\S+/.test(el.textContent) && el.childNodes.length === 1)
        .length      
})

const evalSelect = async (page, evalOnly) => {
	const classyCount = await classedObjects(page)
	const hiCount = classyCount > 100
	if(evalOnly) console.log('classyCount', classyCount)
	const largestImg = !hiCount && await largestImage(page)
	const imgSize = !hiCount && largestImg[2]
	const viewport = !hiCount && page.viewport()
	const viewportSize = !hiCount && viewport.width * viewport.height
	const useImage = !hiCount && (imgSize > 0.5 * viewportSize)
	if(evalOnly) console.log('hiCount, useImage', hiCount, useImage)
	if(evalOnly) console.log('largestImage:', largestImg, useImage, imgSize - 0.5 * viewportSize)
	if(evalOnly) console.log('viewport:', viewportSize)
	//lineup image only
	if(useImage) return 'image'

	//default
	return 'coachella'
}

const cacheResult = async (leKey, result) => {

  await client.connect()
  await client.set(leKey, JSON.stringify(result), {
		EX: 3600 * 24 * 30
	})
  client.quit()
}

const queueForExtract = async (url, lineupUrl) => {
	//store the image in s3 bucket for analysis
	axios.get(url, {
	  responseType: 'arraybuffer',
	})
    .then((res) => {
        //console.log(`Status: ${res.status}`);
        //console.log('Body: ', res.data);

    	const contentType = res.headers['content-type']
    	const body = res.data
    	const ext = url.split(/[#?]/)[0].split('.').pop().trim()
    	console.log('image contentType/file extension', contentType, ext)

      // Once you received all chunks, send to S3
	  const awsRegion = "us-east-1";
	  var s3 = new AWS.S3({ region: awsRegion });
      var params = {
        Bucket: 'arachnival',
        Key: `lineupUrls/${encodeURIComponent(lineupUrl)}.${ext}`,
        Body: body,
        ContentType: contentType
      };
      s3.putObject(params, function(err, data) {
        if (err) {
          console.error(err, err.stack);
        } else {
          console.log(data);
        }
      });
    })
    .catch((err) => {
        console.error(err);
    });
}
/*
const queueForExtract = async (url, lineupUrl) => {
	//store the image in s3 bucket for analysis
  https.get(url, function(res) {
    res.setEncoding('binary')
    var body = '';
    const contentType = res.headers['content-type']
    const ext = url.split(/[#?]/)[0].split('.').pop().trim()

    console.log('image contentType/file extension', contentType, ext)
    res.on('data', function(chunk) {
      // Agregates chunks
      body += chunk;
    });
    res.on('end', function() {
      // Once you received all chunks, send to S3
	  const awsRegion = "us-east-1";
	  var s3 = new AWS.S3({ region: awsRegion });
      var params = {
        Bucket: 'arachnival',
        Key: `lineupUrls/${lineupUrl.replace(/\//g, '-')}.${ext}`,
        Body: body,
        ContentType: contentType
      };
      s3.putObject(params, function(err, data) {
        if (err) {
          console.error(err, err.stack);
        } else {
          console.log(data);
        }
      });
    });
  });

}
*/
module.exports = {title, bottomOut, largestImage, evalSelect, queueForExtract}