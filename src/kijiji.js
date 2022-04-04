import { scrapeInnerTextHOF } from "./common.js";

// Get to Results Page via URL
const navigateToResults = async (page, searchTerm, region, category) => {
    // Alternative: `https://www.kijiji.ca/${category}/${region}/${searchTerm}/k0l1700281?ll=${latitude}%2C${longitude}&radius=${distance}&dc=true`
    await page.goto(`https://www.kijiji.ca/${category}/${region}/${searchTerm}/k0c10l80002?rb=true`)
    await page.setViewport({ width: 1680, height: 971 });
};

const navigateToNextPage = async (page, navigationPromise) => {
    await page.waitForSelector('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await page.click('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await navigationPromise;
}

const getTotalNumResults = async (page) => {
    const scrapeInnerText = scrapeInnerTextHOF(page);
    const text = await scrapeInnerText('.titlecount')
    return Number(text.trim().replace(",", "").replace("(", "").replace(")", ""));
}

const scrapeItem = async (page, index) => {
    const item = {};
    let text;

    const scrapeInnerText = scrapeInnerTextHOF(page);

    // URL
    item.url = page.evaluate(e => e.href, await page.waitForSelector(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title > a`));

    // Title
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title`);
    item.title = text.trim();

    // Price
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .price`);
    item.price = Number(text.trim().replace("$", "").replace(",", ""));

    // Distance
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .distance`);
    item.distance = text.trim();
    
    // Location
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .location:nth-child(1)`);
    item.location = text.trim();

    // DatePosted
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .location > .date-posted`);
    item.postedAt = text.trim();
    
    // Description
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .description`);
    item.desciption = text.trim();

    item.hasMoreInfo = item.desciption.slice(-3) === "...";
    
    return item;
}

export const scrape = async (numPagesOverride, searchTerm) => {
    // Data
    const data = [];

    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        const region = process.ENV.KIJIJI_REGION;
        const category = process.ENV.KIJIJI_CATEGORY;

        // Initial State
        await navigateToResults(page, searchTerm, region, category);

        // Pagination
        const MAX_RESULTS_PER_PAGE = 40;
        const numResults = await getTotalNumResults(page);
        const numPages = numPagesOverride ? numPagesOverride : Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping Kijiji with:\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        page override: ${numPagesOverride}\n
        `);

        for (let pageIndex = 1; pageIndex <= numPages; pageIndex++) {
            for (let itemIndex = 1; itemIndex <= MAX_RESULTS_PER_PAGE ; itemIndex++) {
                const item = await scrapeItem(page, itemIndex);
                // TODO check hasMore, go to page
                console.log(pageIndex, itemIndex, item.title);
                data.push(item);
            }
            await navigateToNextPage(page, navigationPromise);
        }
        await browser.close();
        return data;
    } catch (error) {
        console.log(error.message);
        return data;   
    }
};
