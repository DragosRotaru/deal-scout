const MAX_RESULTS_PER_PAGE = 0;

const navigateToResults = page => async () => {};

const getNumResults = async page => {};

const scrapeResult = page => async () => {};

export const scrape = (browser, db) => async search => {
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

        // Iteration
        loop:
        for (let pageIndex = 1; pageIndex <= scrapeNumPages; pageIndex++) {
            // TODO check URLs against prevSearchResults and count how many there are
            if (0) {
                // Increment search.frequency by * 2;
                break loop;
            }
            for (let resultIndex = 0; resultIndex < numResults; resultIndex++) {
                if (search.resultLimit && search.resultLimit <= (resultIndex * pageIndex)) break loop;
                try {
                    const result = await scrapeResult(page)();
                    await db.query("INSERT INTO table_results(column1, column2) VALUES ($1, $2)", [result.$1, result.$2]);
                    // TODO insert into searches_template_results
                    console.log(pageIndex, resultIndex);   
                } catch (error) {
                    console.error(`failed on ${pageIndex, resultIndex}`)
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