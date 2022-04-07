import { scrapeInnerTextHOF } from "./common.js";

const MAX_RESULTS_PER_PAGE = 40;

// Get to Results Page via URL
const navigateToResults = page => async (searchTerm, region, category, code) => {
    const encodedSearchTerm = encodeURIComponent(searchTerm.replace(" ", "-"));
    await page.goto(`https://www.kijiji.ca/${category}/${region}/${encodedSearchTerm}/${code}?ll=${process.ENV.DEALSCOUT_LATITUDE}%2C${process.ENV.DEALSCOUT_LONGITUDE}&radius=${process.ENV.DEALSCOUT_DISTANCE}&dc=true`)
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

    result.scrapedAt = new Date().toISOString();

    // URL
    result.url = (await page.evaluate(e => e.href, await page.waitForSelector(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title > a`))).split(["?"])[0];

    result.id = result.url.slice(result.url.lastIndexOf("/"));

    // Title
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title`);
    result.title = text.trim();

    // Price
    text = await scrapeInnerText(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .price`);
    if (text.indexOf("Free") > -1 || text.indexOf("Gratuit") > -1) {
        result.price = 0;
    } else {
        result.price = Math.round(parseFloat(text.trim().replace("$", "").replace(",", "")));
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

export const scrape = (browser, db) => async search => {
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Env Variables
        const region = process.ENV.DEALSCOUT_KIJIJI_REGION;
        const code = process.ENV.DEALSCOUT_KIJIJI_CODE;
        const category = process.ENV.DEALSCOUT_KIJIJI_CATEGORY;

        // Initial State
        await navigateToResults(page)(search.term, region, category, code);

        // Pagination
        const numResults = await getNumResults(page);
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping Kijiji with:\n
        search term: ${search.term}\n
        result limit: ${search.resultLimit}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        `);


        const prevSearchResults = await db.query("SELECT * FROM searches_kijiji_results WHERE searchId=$1", [search.id]);

        // Iteration
        loop:
        for (let pageIndex = 1; pageIndex <= numPages; pageIndex++) {
            // TODO check URLs against prevSearchResults and count how many there are
            if (0) {
                // TODO Increment search.frequency by * 2 if pageIndex = 1 and 0
                break loop;
            }
            for (let resultIndex = 1; resultIndex <= MAX_RESULTS_PER_PAGE; resultIndex++) {
                if (search.resultLimit && search.resultLimit <= (resultIndex + (pageIndex-1) * MAX_RESULTS_PER_PAGE )) break loop;   
                try {
                    const result = await scrapeResult(page)(resultIndex);
                    // TODO check hasMore, go to result detail page
                    await db.query(`INSERT into kijiji_results(
                        id,
                        url,
                        title,
                        price,
                        postedAt,
                        scrapedAt,
                        distance,
                        location,
                        description
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
                    [   results.id,
                        results.url,
                        results.title,
                        results.price,
                        results.postedAt,
                        results.scrapedAt,
                        results.distance,
                        results.location,
                        results.desciption
                    ])
                    // TODO insert into searches_kijiji_results

                    console.log(pageIndex, resultIndex, result.title);
                } catch (error) {
                    console.error(`failed on page ${pageIndex}, result ${resultIndex}`);
                    console.error(error.message);
                }
            };
            await navigateToNextPage(page, navigationPromise);
        };
        // TODO update kijijiLastSearchedAt
        await page.close();
    } catch (error) {
        console.error(error.message);
    }
};
