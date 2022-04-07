import { sleep, scrapeInnerTextHOF } from "../utils";

const VIEWPORT_HEIGHT = 971;

const navigateToResults = page => async searchTerm => {
    await page.goto(`https://www.facebook.com/marketplace/category/search/?query=${encodeURIComponent(searchTerm)}`);
    await page.setViewport({ width: 1680, height: VIEWPORT_HEIGHT });
};

const getResultLinks = async page => {
    const links = await page.$$eval('a', as => as.map(a => a.href));
    const resultLinks = links.filter(link => indexOf("https://www.facebook.com/marketplace/item/") > -1 );
    return resultLinks;
};

// De-duplicate and strip parameters
const filterResultLinks = links => [...new Set(links.map(link => link.split("?")[0]))];

const scrollDown = page => page.evaluate(_ => window.scrollBy(VIEWPORT_HEIGHT, window.innerHeight));

const scrapeResult = (page, navigationPromise) => async (url) => {
    const result = {};
    let text;
    const scrapeInnerText = scrapeInnerTextHOF(page);
    await page.goto(url);
    await navigationPromise;

    // URL
    result.url = url;

    // ID
    result.id = url.replace("https://www.facebook.com/marketplace/item/", "").replace("/", "");

    // Title
    text = await scrapeInnerText('.j83agx80 > div > .dati1w0a > div > .d2edcug0');
    result.title = text.trim();

    // Price
    text = await scrapeInnerText('div > .dati1w0a > .aov4n071 > div > .d2edcug0 > span > span');
    result.oldPrice = parseFloat(text.replace("$", "").replace(",", "").replace("C", "").trim());
    
    const priceText = await scrapeInnerText('div > .dati1w0a > .aov4n071 > div > .d2edcug0');
    result.price = parseFloat(priceText.replace(text, "").replace("$", "").replace(",", "").replace("C", "").trim());

    // Location
    text = await scrapeInnerText('.dati1w0a > .aov4n071 > .sjgh65i0 > div > .d2edcug0 > a');
    result.location = text.trim();

    // Listed At
    const listedAtText = await scrapeInnerText('.dati1w0a > .aov4n071 > .sjgh65i0 > div > .d2edcug0');
    const listedAtTrimmed = listedAtText.replace(text, "").replace("Listed").replace("in", "").replace("ago","").trim();
    
    let listedAtQuantity = listedAtTrimmed.indexOf("a ") === 0 || listedAtTrimmed.indexOf("an ") === 0 ? 1 : parseInt(listedAtTrimmed);
    let dateOffset = 0;
    
    const miliSecsPerMin = 60 * 1000;
    const miliSecsPerHour = 60 * miliSecsPerMin;
    const miliSecsPerDay = 24 * miliSecsPerHour;
    
    if (listedAtTrimmed.indexOf("minute") > -1 ) {
        dateOffset = listedAtQuantity * miliSecsPerMin;
    } else if (listedAtTrimmed.indexOf("hour") > -1 ) {
        dateOffset = listedAtQuantity * miliSecsPerHour;
    } else if (listedAtTrimmed.indexOf("day") > -1 ) {
        dateOffset = listedAtQuantity * miliSecsPerDay;
    } else if (listedAtTrimmed.indexOf("week") > -1 ) {
        dateOffset = listedAtQuantity * 7 * miliSecsPerDay;
    } else if (listedAtTrimmed.indexOf("month") > -1 ) {
        dateOffset = listedAtQuantity * 30 * miliSecsPerDay;
    } else if (listedAtTrimmed.indexOf("year") > -1 ) {
        dateOffset = listedAtQuantity * 365 * miliSecsPerDay;
    }
    const myDate = new Date();
    myDate.setTime(myDate.getTime() - dateOffset);
    result.postedAt = myDate.toISOString();

    // Condition
    text = await scrapeInnerText('.n99xedck:nth-child(2) > .j83agx80 > .qzhwtbm6 > .d2edcug0 > .d2edcug0');
    result.condition = text.trim();

    // Description
    // TODO deal with "read more"
    text = await scrapeInnerText('.rq0escxv > .rq0escxv > .ii04i59q > div > .d2edcug0');
    result.description = text.trim();

    return result;
};

export const scrape = (browser, db) => async search => {
    try {
        // Puppeteer
        const page = await browser.newPage();
        const navigationPromise = page.waitForNavigation();

        // Initial State
        await navigateToResults(page);

        console.log(`Scraping Facebook Marketplace with:\n
        search term: ${search.term}\n
        result limit: ${search.resultLimit}\n
        results per page: unknown\n
        number of results: unknown\n
        number of pages: infinite scroll\n
        `);

        // Infinite Scrolling
        const waitPeriod = 1000;
        const noNewResultsCount = 0;
        const timesScrolled = 0;
        let resultLinks, newResultLinks = [];
        
        const prevSearchResults = await db.query("SELECT * FROM searches_fbmarketplace_results WHERE searchId=$1", [search.id]);

        try {
            loop:
            while (resultLinks.length < search.resultLimit && noNewResultsCount < 4 && waitPeriod < 30000 ) {
                await scrollDown(page);
                timesScrolled++;
                while (newResultLinks.length === resultLinks.length  && noNewResultsCount < 4 && waitPeriod < 30000 ) {
                    await sleep(waitPeriod);
                    newResultLinks = await getResultLinks(page);
                    if (newResultLinks.length === resultLinks.length) {
                        waitPeriod =+ 200;
                        noNewResultsCount++;
                    };
                };
                if (resultLinks.length !== newResultLinks.length) {
                    noNewResultsCount = 0;
                    resultLinks = newResultLinks;
                    if (0) {
                        // TODO check URLs against prevSearchResults and count how many there are
                        // Increment search.frequency by * 2 if timesScrolled = 1;
                        break loop;
                    }
                };
            };
            if (noNewResultsCount >= 4 || waitPeriod > 30000) {
                console.log(`infinite scroll limits reached, no new results: ${noNewResultsCount}, waitPeriod: ${waitPeriod}, results: ${resultLinks.length}`)
            }
        } catch (error) {
            console.error("failed on indexing via infinite scroll");
            console.error(error.message);
        }

        resultLinks = filterResultLinks(resultLinks);

        for (let resultIndex = 0; resultIndex < resultLinks.length; resultIndex++) {
            try {
                const result = await scrapeResult(resultLinks[resultIndex], navigationPromise);
                // TODO insert into fbmarketplace_results and searches_fbmarketplace_results
                console.log(resultIndex, result.title);   
            } catch (error) {
                console.error(`failed on result ${resultIndex}`)
                console.error(error.message);
            }
        }

        // TODO update fbmarketplaceLastSearchedAt
        await page.close();
    } catch (error) {
        console.error(error.message);
    }
};