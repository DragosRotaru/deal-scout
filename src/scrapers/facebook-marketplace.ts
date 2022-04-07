import { Browser, HTTPResponse, Page } from "puppeteer";
import { Client } from "pg";
import { Search } from "../types";
import { 
    sleep,
    scrapeInnerTextHOF,
    MILLISECONDS_PER_MIN,
    MILLISECONDS_PER_HOUR,
    MILLISECONDS_PER_DAY,
    stripURLParams,
    filterUnique
} from "../utils";

type Result = {
    id: string,
    url: string,
    title: string,
    price: number,
    oldPrice: number,
    postedAt: string,
    scrapedAt: string,
    location: string,
    condition: string,
    description: string,
}

const VIEWPORT_HEIGHT: number = 971;

const ITEM_BASE_URL: string = "https://www.facebook.com/marketplace/item/";

const navigateToResults = (page: Page) => async (searchTerm: string): Promise<void> => {
    await page.goto(`https://www.facebook.com/marketplace/category/search/?query=${encodeURIComponent(searchTerm)}`);
    await page.setViewport({ width: 1680, height: VIEWPORT_HEIGHT });
};

const getResultLinks = async (page: Page): Promise<string[]> => {
    const links = await page.$$eval('a', as => as.map((a: any) => a.href));
    return links.filter(link => link.indexOf(ITEM_BASE_URL) === 0 );
};

const filterResultLinks = (links: string[]): string[] => filterUnique(links.map(stripURLParams));

const scrollDown = (page: Page): Promise<void> => page.evaluate(_ => window.scrollBy(VIEWPORT_HEIGHT, window.innerHeight));

const parsePrice = (text: string): number => Math.round(parseFloat(text.replace("$", "").replace(",", "").replace("C", "").trim()));

const scrapeResult = (page: Page, navigationPromise: Promise<HTTPResponse | null>) => async (url: string): Promise<Result> => {
    const result: Partial<Result> = {};
    let text: string;

    const scrapeInnerText = scrapeInnerTextHOF(page);
    await page.goto(url);
    await navigationPromise;

    // URL
    result.url = url;

    // ID
    result.id = url.replace(ITEM_BASE_URL, "").replace("/", "");

    // Title
    text = await scrapeInnerText('.j83agx80 > div > .dati1w0a > div > .d2edcug0');
    result.title = text.trim();

    // Price
    text = await scrapeInnerText('div > .dati1w0a > .aov4n071 > div > .d2edcug0 > span > span');
    result.oldPrice = parsePrice(text);
    
    const priceText: string = await scrapeInnerText('div > .dati1w0a > .aov4n071 > div > .d2edcug0');
    result.price = parsePrice(priceText.replace(text, ""));

    // Location
    text = await scrapeInnerText('.dati1w0a > .aov4n071 > .sjgh65i0 > div > .d2edcug0 > a');
    result.location = text.trim();

    // Listed At
    const listedAtText: string = await scrapeInnerText('.dati1w0a > .aov4n071 > .sjgh65i0 > div > .d2edcug0');
    const listedAtTrimmed: string = listedAtText.replace(text, "").replace("Listed", "").replace("in", "").replace("ago","").trim();
    
    let listedAtQuantity: number = listedAtTrimmed.indexOf("a ") === 0 || listedAtTrimmed.indexOf("an ") === 0 ? 1 : parseInt(listedAtTrimmed);
    let dateOffset: number = 0;
    
    if (listedAtTrimmed.indexOf("minute") > -1 ) {
        dateOffset = listedAtQuantity * MILLISECONDS_PER_MIN;
    } else if (listedAtTrimmed.indexOf("hour") > -1 ) {
        dateOffset = listedAtQuantity * MILLISECONDS_PER_HOUR;
    } else if (listedAtTrimmed.indexOf("day") > -1 ) {
        dateOffset = listedAtQuantity * MILLISECONDS_PER_DAY;
    } else if (listedAtTrimmed.indexOf("week") > -1 ) {
        dateOffset = listedAtQuantity * 7 * MILLISECONDS_PER_DAY;
    } else if (listedAtTrimmed.indexOf("month") > -1 ) {
        dateOffset = listedAtQuantity * 30 * MILLISECONDS_PER_DAY;
    } else if (listedAtTrimmed.indexOf("year") > -1 ) {
        dateOffset = listedAtQuantity * 365 * MILLISECONDS_PER_DAY;
    }
    const postedAt: Date = new Date();
    postedAt.setTime(postedAt.getTime() - dateOffset);
    result.postedAt = postedAt.toISOString();

    // Condition
    text = await scrapeInnerText('.n99xedck:nth-child(2) > .j83agx80 > .qzhwtbm6 > .d2edcug0 > .d2edcug0');
    result.condition = text.trim();

    // Description
    // TODO deal with "read more"
    text = await scrapeInnerText('.rq0escxv > .rq0escxv > .ii04i59q > div > .d2edcug0');
    result.description = text.trim();

    return result as Result;
};

export const scrape = (browser: Browser, db: Client) => async (search: Search): Promise<void> => {
    try {
        // Puppeteer
        const page: Page = await browser.newPage();
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
        let waitPeriod: number = 1000;
        let noNewResultsCount: number = 0;
        let timesScrolled: number = 0;
        let resultLinks: string[] = []
        let newResultLinks: string[] = [];
        
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
                        waitPeriod += 200;
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
        } catch (error: any) {
            console.error("failed on indexing via infinite scroll");
            console.error(error.message);
        }

        resultLinks = filterResultLinks(resultLinks);

        for (let resultIndex = 0; resultIndex < resultLinks.length; resultIndex++) {
            try {
                const result = await scrapeResult(page, navigationPromise)(resultLinks[resultIndex] as string);
                // TODO insert into fbmarketplace_results and searches_fbmarketplace_results
                console.log(resultIndex, result.title);   
            } catch (error: any) {
                console.error(`failed on result ${resultIndex}`)
                console.error(error.message);
            }
        }

        // TODO update fbmarketplaceLastSearchedAt
        await page.close();
    } catch (error: any) {
        console.error(error.message);
    }
};