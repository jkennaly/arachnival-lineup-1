// coachella.js

const util = require('./util')

const { bottomOut } = util


module.exports = async function coachella(bandPage) {


    return bandPage
    	.then(() => bottomOut(bandPage))
          /*
          .then(p => p.evaluate(() => {
            return Array.from(document.querySelectorAll('*'))
              .reduce((max, el) => el.offsetHeight > max ? el.offsetHeight : max, -1)
          })
          .then(h => console.log('Coachella max height', h)))
          */
          .then(p => p.evaluate(() => {

           return Array.from(document.querySelectorAll('[class]'))
              .filter(el => el.textContent && /\S+/.test(el.textContent) && el.childNodes.length === 1)
              .map(el => el.className.split(' '))
              .reduce((pv, cv) => [...pv, ...cv], [])
              .filter(cn => /\S+/.test(cn))
              .sort().filter((cn, i, ar) => !i || cn !== ar[i - 1])
              .map(className => [className, Array.from( document.querySelectorAll(`.${className}`))])
              .filter(([className, els]) => els.length = els
                  .sort((a, b) => b.textContent.localeCompare(a.textContent))
                  .filter((cn, i, ar) => !i || cn.textContent !== ar[i - 1].textContent).length)
              .filter(([className, els]) => els.some(el => !/,/.test(el.textContent)))
              .sort((a, b) => b[1].length - a[1].length)
              .reduce((pv, cv) => pv || cv[1], false)
              .map(el => el.textContent)
            }))

}