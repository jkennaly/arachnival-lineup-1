const chromium = require('chrome-aws-lambda');
const coachella = require('./pageHandlers/coachella')
const image = require('./pageHandlers/image')
const util = require('./pageHandlers/util')


exports.handler = async (event, context, callback) => {
    let lineupUrl = "https://bigearsfestival.org/2022-festival/"
    let responseCode = 200;
    let evalOnly = false;
    //console.log("request: " + JSON.stringify(event));

    if(event.Records && event.Records[0] && event.Records[0].Sns && event.Records[0].Sns.Message) {
    	try {
    		const parsedMessage = JSON.parse(event.Records[0].Sns.Message)
    		lineupUrl = parsedMessage.lineupUrl
    		evalOnly = Boolean(parsedMessage,evalOnly)
    	} catch (err) {
    		console.error('Sns Message parse error')
    		console.error(err)
    	}
    } else if (event.queryStringParameters && event.queryStringParameters.lineupUrl) {
        lineupUrl = event.queryStringParameters.lineupUrl;
    }
    if (event.queryStringParameters && event.queryStringParameters.evalOnly) {
        evalOnly = Boolean(event.queryStringParameters.evalOnly);
    }
  const leKey = 'arach-lineup.' + lineupUrl
  let result = null;
  let browser = null;

  try {
    //console.log('about to get font')
  	await chromium.font('/opt/nodejs/.fonts/NotoColorEmoji.ttf');
    //console.log('about to launch')
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();

    //console.log('about to navigate to ' + lineupUrl)
    await page.goto(lineupUrl);

    const evalType = await util.evalSelect(page, evalOnly)
    if(evalOnly) {
    	console.log('EvalOnly Mode result', evalType)
    	return callback(null, evalType)
    }
    switch(evalType) {
    	case 'coachella':
    		result = await coachella(page);
  			util.cacheResult(leKey, result)
    		break;
    	case 'image':
    		result = await image(page);
    		util.queueForExtract(result, lineupUrl)
    		break;
    	default:
    		result = await util.title(page);
    }
  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
  //console.log('Spidey sensed', result)
  return callback(null, result);
};