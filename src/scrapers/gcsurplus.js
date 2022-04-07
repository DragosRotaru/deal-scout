import { scrapeInnerTextHOF } from "../utils";

const MAX_RESULTS_PER_PAGE = 25;

// Select Search Filters and Show Results
const selectSearchFilters = async (page, navigationPromise) => {
    await page.waitForSelector('#srchPanel > #dropdowns > .col-np-12 > #region > option');
    await page.click('#srchPanel > #dropdowns > .col-np-12 > #region > option');
    await page.select('#cmdty', '');
    await page.waitForSelector('#srchPanel > #dropdowns > .col-np-12 > #cmdty > option:nth-child(1)');
    await page.click('#srchPanel > #dropdowns > .col-np-12 > #cmdty > option:nth-child(1)');
    await page.waitForSelector('.panel > #srchPanel > #dropdowns > .col-np-12 > .btn:nth-child(1)');
    await page.click('.panel > #srchPanel > #dropdowns > .col-np-12 > .btn:nth-child(1)');
    await navigationPromise;
};

// Get to Results Page via navigation
const navigateToResultsComplex = async page => {
    await page.goto('https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&vndsld=0');
    await page.setViewport({ width: 1680, height: 971 });
    await selectSearchFilters();
};

// Get to Results Page via URL
const navigateToResults = async page => {
    await page.goto('https://gcsurplus.ca/mn-eng.cfm?&snc=wfsav&vndsld=0&sc=ach-shop&lci=&sf=ferm-clos&so=ASC&srchtype=&hpcs=&hpsr=All&kws=&jstp=&str=1&&sr=1&rpp=25');
    await page.setViewport({ width: 1680, height: 971 });
};

// Set maximum number of results per page
const setMaxResultsPerPage = async (page, navigationPromise) => {
    await page.waitForSelector('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
    await page.click('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
    await navigationPromise;
};

// Get the Total Number of Results Available
const getNumResults = async page => {
    const scrapeInnerText = scrapeInnerTextHOF(page);
    const text = await scrapeInnerText('.panel > .panel-body > .col-np-12 > .col-np-7 > .prevNext');
    return parseInt(text.slice(text.indexOf("of ")).replace(",", "").replace(")", "").replace("of", "").trim());
};

// Next Page
const navigateToNextPage = async (page, navigationPromise) => {
    await page.waitForSelector('.col-np-12 > #bottomPrevNext > .pager > .next > a');
    await page.click('.col-np-12 > #bottomPrevNext > .pager > .next > a');
    await navigationPromise;
};

// Navigate to Each Result
const navigateToResult = (page, navigationPromise) => async index => {
    await page.waitForSelector(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
    await page.click(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
    await navigationPromise;
};


const scrapeResult = async page => {

    const result = {};
    let text;

    const scrapeInnerText = scrapeInnerTextHOF(page);

    // Title
    text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .fontSize120');
    result.title = text.trim();

    // Current Bid
    text = await scrapeInnerText('#currentBid');
    result.oldPrice = parseFloat(text.trim().replace("$", "").replace(",", ""));

    // Next Minimum Bid
    text = await scrapeInnerText('#openBidMin');
    result.price = parseFloat(text.trim().replace("$", "").replace(",", "")); // 123.43    

    // Bid Start Date
    text = await scrapeInnerText('#openBidDt');
    result.postedAt = text.trim(); // '4-April-2022 @ 02:11:00 pm EDT',

    // Closing Date
    text = await scrapeInnerText('#closingDateId');
    result.closingAt = text.trim(); // '4-April-2022 @ 02:11:00 pm EDT'

    // Details
    text = await scrapeInnerText('#itemCmntId');
    result.description = text.trim();

    // Detect if Quantity Property is present
    text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(9)');
    hasQuantity = text.indexOf("Quantity") > -1;
    
    const offset = hasQuantity ? 0 : -2;

    if (hasQuantity) {
        // Quantity
        text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${10 + offset})`);
        result.quantity = parseInt(text.trim());
    }

    // Location
    text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${12 + offset})`);
    result.location = text.trim(); // 'Petawawa, ON'

    // Sale / Lot ID
    text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${14 + offset})`);
    result.id = text; // 'R1OT0015488 - 1OT013965-W8B24-JB'

    return result;
};


export const scrape = (browser, db) => async settings => {
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Initial State
        await navigateToResults(page);
        await setMaxResultsPerPage(page,navigationPromise);

        // Pagination
        const numResults = await getTotalNumResults(page);
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping GCSurplus with:\n
        result limit: ${settings.gcsurplus.resultLimit}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        `);

        const previousResults = await db.query("SELECT * FROM gcsurplus_results");

        // Iteration
        let resultCounter = 0;

        loop:
        for (let pageIndex = 1; pageIndex <= nunPages ; pageIndex++) {

            /* 

            TODO: grab the IDs of all results on the current page, and compare to the previousResults
            If there are no new search results, break out of the loop. Additionally, if we are on pageIndex 1,
            increase the settings.gcsurplus.frequency by * 2;
            
            */
 
            for (let resultIndex = 1; resultIndex <= MAX_RESULTS_PER_PAGE; resultIndex++) {

                
                // exit loops if we have hit the resultLimit
                if (settings.gcsurplus.resultLimit && settings.gcsurplus.resultLimit <= resultCounter) break loop;

                try {
                    await navigateToResult(page,navigationPromise)(resultIndex);
                    const result = await scrapeResult(page);
                    // TODO INSERT results

                    console.log(pageIndex, resultIndex, result.title);
                    resultCounter++;
                    await page.goBack();
                } catch (error) {
                    console.error(`failed on page ${pageIndex}, result ${resultIndex}, resultCounter: ${resultCounter}, result id ${result.id}`);
                    console.error(error.message);
                }
            }
            await navigateToNextPage(page, navigationPromise);
        }

        // TODO update settings.gcsurplus.lastSearchedAt;
        await page.close();
    } catch (error) {
        console.error(error.message);
    }
}
