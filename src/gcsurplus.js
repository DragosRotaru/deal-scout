import puppeteer from "puppeteer";

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
const navigateToResultsComplex = async (page) => {
    await page.goto('https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&vndsld=0');
    await page.setViewport({ width: 1680, height: 971 });
    await selectSearchFilters();
};

// Get to Results Page via URL
const navigateToResults = async (page) => {
    await page.goto('https://gcsurplus.ca/mn-eng.cfm?&snc=wfsav&vndsld=0&sc=ach-shop&lci=&sf=ferm-clos&so=ASC&srchtype=&hpcs=&hpsr=All&kws=&jstp=&str=1&&sr=1&rpp=25');
    await page.setViewport({ width: 1680, height: 971 });
};

// See 25/Page
const setMaxResultsPerPage = async (page, navigationPromise) => {
    await page.waitForSelector('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
    await page.click('.panel-body > .col-np-12 > .col-np-7 > .prevNext > a');
    await navigationPromise;
};

// Get the Total Number of Results Available
const getTotalNumResults = async (page) => {
    await page.waitForSelector('.panel > .panel-body > .col-np-12 > .col-np-7 > .prevNext')
    // TODO get text
    /* 
    <div class="prevNext">Results per page: <a>10</a>&nbsp; 25 &nbsp;&nbsp; (1- 25  of 1094)</div>
    */
    await page.click('.panel > .panel-body > .col-np-12 > .col-np-7 > .prevNext')  
    return 1094;
};

// Next Page
const navigateToNextPage = async (page, navigationPromise) => {
    await page.waitForSelector('.col-np-12 > #bottomPrevNext > .pager > .next > a');
    await page.click('.col-np-12 > #bottomPrevNext > .pager > .next > a');
    await navigationPromise;
};

// Navigate to Each Item
const navigateToItem = async (index, page, navigationPromise) => {
    await page.waitForSelector(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
    await page.click(`tr:nth-child(${index}) > .width75 > .col-np-12 > .novisit > a`);
    await navigationPromise;
    await navigationPromise;   
};


const scrapeInnerTextHOF = (page) => async (selector) => page.evaluate(e => e.textContent, await page.waitForSelector(selector));

const scrapeItem = async (page) => {

    const item = {};
    let text;

    const scrapeInnerText = scrapeInnerTextHOF(page);

    // Title
    text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .fontSize120');
    item.title = text.trim();

    // Current Bid
    text = await scrapeInnerText('#currentBid');
    item.currentBid = Number(text.trim().replace("$", "").replace(",", ""));

    // Bid Start Date
    text = await scrapeInnerText('#openBidDt');
    item.startedAt = text.trim(); // '4-April-2022 @ 02:11:00 pm EDT',

    // Time Remaining
    text = await scrapeInnerText('#timeRemaining');
    item.timeRemaining = text.trim(); // '0 minutes 37 seconds',

    // Next Minimum Bid
    text = await scrapeInnerText('#openBidMin');
    item.nextMinimumBid = Number(text.trim().replace("$", "").replace(",", "")); // 123.43

    // Closing Date
    text = await scrapeInnerText('#closingDateId');
    item.closingAt = text.trim(); // '4-April-2022 @ 02:11:00 pm EDT'

    // Details
    text = await scrapeInnerText('#itemCmntId');
    item.description = text.trim();

    // Detect if Quantity Property is present
    text = await scrapeInnerText('#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(9)');
    hasQuantity = text.indexOf("Quantity") > -1;
    
    const offset = hasQuantity ? 0 : -2;

    if (hasQuantity) {
        // Quantity
        text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${10 + offset})`);
        item.quantity = Number(text.trim());
    }

    // Location
    text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${12 + offset})`);
    item.location = text.trim(); // 'Petawawa, ON'

    // Sale / Lot ID
    text = await scrapeInnerText(`#bidPanelId > .panel > .panel-body > .table-display > .short:nth-child(${14 + offset})`);
    item.id = text; // 'R1OT0015488 - 1OT013965-W8B24-JB'

    return item;
};


export const scrape = async (numPagesOverride) => {
    // Data
    const data = [];

    try {
        // Puppeteer
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();


        // Initial State
        await navigateToResults(page);
        await setMaxResultsPerPage(page,navigationPromise);

        // Pagination
        const MAX_RESULTS_PER_PAGE = 25;
        const numResults = await getTotalNumResults(page);
        const numPages = numPagesOverride ? numPagesOverride : Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        // Iteration
        for (let pageIndex = 1; pageIndex <= numPages ; pageIndex++) {
            for (let itemIndex = 1; itemIndex <= 25; itemIndex++) {
                await navigateToItem(itemIndex, page,navigationPromise);
                const item = await scrapeItem(page);
                data.push(item);
                console.log(pageIndex, itemIndex, item.title);
                await page.goBack();
            }
            await navigateToNextPage(page, navigationPromise);
        }

        await browser.close();
        return data;
    } catch (error) {
        console.log(error.message);
        return data; 
    }
}
