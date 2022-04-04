import puppeteer from "puppeteer"

export const scrape = async (numPagesOverride) => {

    // Puppeteer
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation();

    // Select Search Filters and Show Results
    const selectSearchFilters = async () => {
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
    const navigateToResultsComplex = async () => {
        await page.goto('https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&vndsld=0');
        await page.setViewport({ width: 1680, height: 971 });
        await selectSearchFilters();
    };

    // Get to Results Page via URL
    const navigateToResults = async () => {
        await page.goto('https://gcsurplus.ca/mn-eng.cfm?&snc=wfsav&vndsld=0&sc=ach-shop&lci=&sf=ferm-clos&so=ASC&srchtype=&hpcs=&hpsr=All&kws=&jstp=&str=1&&sr=1&rpp=25');
        await page.setViewport({ width: 1680, height: 971 });
    };

    // See 25/Page
    const setMaxResultsPerPage = async () => {
        await page.waitForSelector('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
        await page.click('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
        await navigationPromise;
    };

    // Get the Total Number of Results Available
    const getTotalNumResults = async () => {
        await page.waitForSelector('.panel > .panel-body > .col-np-12 > .col-np-7 > .prevNext')
        // TODO get text
        /* 
        <div class="prevNext">Results per page: <a>10</a>&nbsp; 25 &nbsp;&nbsp; (1- 25  of 1094)</div>
        */
        await page.click('.panel > .panel-body > .col-np-12 > .col-np-7 > .prevNext')  
        return 1094;
    };

    // Next Page
    const navigateToNextPage = async () => {
        await page.waitForSelector('.col-np-12 > #bottomPrevNext > .pager > .next > a');
        await page.click('.col-np-12 > #bottomPrevNext > .pager > .next > a');
        await navigationPromise;
    };

    // Navigate to Each Item
    const navigateToItem = async (index) => {
        await page.waitForSelector(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
        await page.click(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
        await navigationPromise;
        await navigationPromise;   
    };


    const scrapeInnerText = async (selector) => page.evaluate(e => e.innerHTML, await page.waitForSelector(selector));

    const scrapeItem = async () => {
        const item = {};
        let text;
    
        // Title
        text = await scrapeInnerText('#wb-auto-2 > #bidPanelId > .panel > .panel-body > .fontSize120');
        item.title = text.trim();

        // Current Bid
        text = await scrapeInnerText('#currentBid');
        item.currentBid = text.trim();

        // Bid Start Date
        text = await scrapeInnerText('#openBidDt');
        item.startedAt = text.trim();

        // Time Remaining
        text = await scrapeInnerText('#timeRemaining');
        item.timeRemaining = text.trim();

        // Next Minimum Bid
        text = await scrapeInnerText('#openBidMin');
        item.nextMinimumBid = text.trim();

        // Quantity
        text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(10)');
        item.quantity = text.trim();

        // Location
        text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(12)');
        item.location = text.trim();

        // Sale / Lot ID
        text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(14)');
        item.id = text;

        // Closing Date
        text = await scrapeInnerText('#closingDateId');
        item.closingAt = text.trim();

        // Details
        text = await scrapeInnerText('#itemCmntId');
        item.description = text.trim();

        return item;
    };

    // Initial State
    await navigateToResults();
    await setMaxResultsPerPage();

    // Data
    const data = [];

    // Pagination
    const MAX_RESULTS_PER_PAGE = 25;
    const numResults = await getTotalNumResults();
    const numPages = numPagesOverride ? numPagesOverride : Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

    // Iteration
    for (let pageIndex = 1; pageIndex <= numPages ; pageIndex++) {
        for (let itemIndex = 1; itemIndex <= 25; itemIndex++) {
            await navigateToItem(itemIndex);
            const item = await scrapeItem();
            console.log(item);
            data.push(item);
            await page.goBack();
        }
        await navigateToNextPage();
    }

    await browser.close();
}
