import { Client } from "pg";
import { Browser, HTTPResponse, Page } from "puppeteer";
import { Search } from "../types";
import { scrapeInnerTextHOF, stripURLParams } from "../utils";

type Result = {
    id: string,
    url: string,
    scrapedAt: string, 
    title: string,
    price: number,
    distance: string,
    location: string,
    postedAt: string
    description: string,
    hasMoreInfo: boolean,
};

const MAX_RESULTS_PER_PAGE = 40;

// Get to Results Page via URL
const navigateToResults = (page: Page) => async (searchTerm: string, region: string, category: string, code: string): Promise<void> => {
    const encodedSearchTerm = encodeURIComponent(searchTerm.replace(" ", "-"));
    await page.goto(`https://www.kijiji.ca/${category}/${region}/${encodedSearchTerm}/${code}?ll=${process.env['DEALSCOUT_LATITUDE']}%2C${process.env['DEALSCOUT_LONGITUDE']}&radius=${process.env['DEALSCOUT_DISTANCE']}&dc=true`)
    await page.setViewport({ width: 1680, height: 971 });
};

const navigateToNextPage = async (page: Page, navigationPromise: Promise<HTTPResponse | null>): Promise<void> => {
    await page.waitForSelector('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await page.click('main > .container-results > .bottom-bar > .pagination > a:nth-child(13)');
    await navigationPromise;
}

const getNumResults = async (page: Page): Promise<number> => {
    const scrapeInnerText = scrapeInnerTextHOF(page);
    const text = await scrapeInnerText('.titlecount')
    return parseInt(text.trim().replace(",", "").replace("(", "").replace(")", ""));
}


const scrapeResult = (page: Page) => async (index: number): Promise<Result> => {
    const result: Partial<Result> = {};
    let text;

    const scrapeInnerText = scrapeInnerTextHOF(page);

    result.scrapedAt = new Date().toISOString();

    // URL
    const url = stripURLParams(await page.evaluate(e => e.href, await page.waitForSelector(`.search-item:nth-child(${index}) > .clearfix > .info > .info-container > .title > a`)));
    result.url = url;

    result.id = url.slice(url.lastIndexOf("/"));

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
    const description = text.trim();

    result.description = description;

    result.hasMoreInfo = description.slice(-3) === "...";
    
    return result as Result;
}

export const scrape = (browser: Browser, db: Client) => async (search: Search): Promise<void> => {
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Env Variables
        const region = process.env['DEALSCOUT_KIJIJI_REGION'];
        const code = process.env['DEALSCOUT_KIJIJI_CODE'];
        const category = process.env['DEALSCOUT_KIJIJI_CATEGORY'];

        if (!region || !code || !category ) throw new Error("environment variables missing");
    
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
                    [   result.id,
                        result.url,
                        result.title,
                        result.price,
                        result.postedAt,
                        result.scrapedAt,
                        result.distance,
                        result.location,
                        result.description
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
