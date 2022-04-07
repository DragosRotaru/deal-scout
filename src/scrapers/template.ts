import { Client } from "pg";
import { Browser, Page } from "puppeteer";
import { Search } from "../types";

const MAX_RESULTS_PER_PAGE: number = 0;

type Result = {
    id: string;
};

const navigateToResults = (page: Page) => async (): Promise<void> => {};

const getNumResults = async (page: Page): Promise<number> => 0;

const scrapeResult = (page: Page) => async (): Promise<Result> => ({ id : "string" });

export const scrape = (browser: Browser, db: Client) => async (search: Search): Promise<void> => {
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Initial State
        await navigateToResults(page);
        
        // Pagination
        const numResults = await getNumResults(page);
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping TEMPLATE with:\n
        search term: ${search.term}\n
        result limit: ${search.resultLimit}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        `);

        const prevSearchResults = await db.query("SELECT * FROM searches_template_results WHERE searchId=$1", [search.id]);

        let resultCounter = 0;

        // Iteration
        loop:
        for (let pageIndex = 1; pageIndex <= numPages; pageIndex++) {
            // TODO check URLs against prevSearchResults and count how many there are
            if (0) {
                // Increment search.frequency by * 2;
                break loop;
            }
            for (let resultIndex = 0; resultIndex < numResults; resultIndex++) {

                if (search.resultLimit && search.resultLimit <= resultCounter) break loop;

                try {
                    const result = await scrapeResult(page)();
                    await db.query("INSERT INTO table_results(column1, column2) VALUES ($1, $2)", [result.id]);
                    // TODO insert into searches_template_results
                    console.log(pageIndex, resultIndex);   
                    resultCounter++;
                } catch (error) {
                    console.error(`failed on page ${pageIndex}, result ${resultIndex}`);
                    console.error(error.message);
                }
            }
        }

        // TODO update templateLastSearchedAt
        await page.close();
    } catch (error) {
        console.error(error.message);
    }
};