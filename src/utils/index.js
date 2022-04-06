export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const scrapeInnerTextHOF = page => async selector => page.evaluate(e => e.textContent, await page.waitForSelector(selector));