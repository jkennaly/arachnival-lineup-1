// image.js

const util = require('./util')

const { largestImage } = util


module.exports = async function image(page) {

	const largestImg = await largestImage(page)
	console.log('lineupImage guess:', largestImg)
	return largestImg[1]

}