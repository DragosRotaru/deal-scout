import { scrapeInnerTextHOF } from "./common.js";

const MAX_RESULTS_PER_PAGE = 40;

// Get to Results Page via URL
const navigateToResults = page => async (searchTerm, region, category, code) => {
    const encodedSearchTerm = encodeURIComponent(searchTerm.replace(" ", "-"));
    await page.goto(`https://www.kijiji.ca/${category}/${region}/${encodedSearchTerm}/${code}?ll=${process.ENV.LATITUDE}%2C${process.ENV.LONGITUDE}&radius=${process.ENV.DISTANCE}&dc=true`)
    await page.setViewport({ width: 1680, height: 971 });
};

const navigateToNextPage = async (page, navigationPromise) => {
    await page.waitForSelector('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await page.click('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await navigationPromise;
}

const getNumResults = async page => {
    const scrapeInnerText = scrapeInnerTextHOF(page);
    const text = await scrapeInnerText('.titlecount')
    return parseInt(text.trim().replace(",", "").replace("(", "").replace(")", ""));
}

const scrapeResult = page => async index => {
    const result = {};
    let text;

    const scrapeInnerText = scrapeInnerTextHOF(page);

    // URL
    result.url = page.evaluate(e => e.href, await page.waitForSelector(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title > a`));

    // Title
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title`);
    result.title = text.trim();

    // Price
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .price`);
    if (text.indexOf("Free") > -1 || text.indexOf("Gratuit") > -1) {
        result.price = 0;
    } else {
        result.price = parseFloat(text.trim().replace("$", "").replace(",", ""));
    }

    // Distance
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .distance`);
    result.distance = text.trim();
    
    // Location
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .location:nth-child(1)`);
    result.location = text.trim();

    // DatePosted
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .location > .date-posted`);
    result.postedAt = text.trim();
    
    // Description
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .description`);
    result.desciption = text.trim();

    result.hasMoreInfo = result.desciption.slice(-3) === "...";
    
    return result;
}

export const scrape = browser =>  async (searchTerm, numPagesOverride) => {
    // Data
    const results = [];
    try {
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        const region = process.ENV.KIJIJI_REGION;
        const code = process.ENV.KIJIJI_CODE;
        const category = process.ENV.KIJIJI_CATEGORY;

        // Initial State
        await navigateToResults(page)(searchTerm, region, category, code);

        // Pagination
        const numResults = await getNumResults(page);
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);
        const scrapeNumPages = numPagesOverride ? numPagesOverride : numPages;

        console.log(`Scraping Kijiji with:\n
        search term: ${searchTerm}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        page override: ${numPagesOverride}\n
        `);

        // Iteration
        for (let pageIndex = 1; pageIndex <= scrapeNumPages; pageIndex++) {
            for (let resultIndex = 1; resultIndex <= MAX_RESULTS_PER_PAGE ; resultIndex++) {
                const result = await scrapeResult(page)(resultIndex);
                // TODO check hasMore, go to result detail page
                results.push(result);
                console.log(pageIndex, resultIndex, result.title);
            };
            await navigateToNextPage(page, navigationPromise);
        };
        
        // Return and close   
        await page.close();
        return results;

    } catch (error) {
        console.log(error.message);
        return results;   
    }
};
