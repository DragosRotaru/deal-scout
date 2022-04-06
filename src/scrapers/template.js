const MAX_RESULTS_PER_PAGE = 0;

const navigateToResults = page => async () => {};

const getNumResults = async page => {};

const scrapeResult = page => async () => {};

export const scrape = browser => async numPagesOverride => {
    // Data
    const results = [];
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Initial State
        await navigateToResults(page);
        
        // Pagination
        const numResults = await getNumResults(page);
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);
        const scrapeNumPages = numPagesOverride ? numPagesOverride : numPages;

        console.log(`Scraping TEMPLATE with:\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        page override: ${numPagesOverride}\n
        `);

        // Iteration
        for (let pageIndex = 1; pageIndex <= scrapeNumPages; pageIndex++) {
            for (let resultIndex = 0; resultIndex < numResults; resultIndex++) {
                const result = await scrapeResult(page)();
                results.push(result);
                console.log(pageInex, resultIndex);
            }
        }

        // Return and close
        await page.close();
        return results;

    } catch (error) {
        console.log(error.message);
        return results;
    }
};