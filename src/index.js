import puppeteer from "puppeteer";
import { gcsurplus, bunz, kijiji, fbMarketplace } from "./scrapers";

const keywords = ["subwoofer"];

const data = {
    bunz: [],
    gc: [],
    kijiji: [],
    fbMarketplace: []
};

const scrape = async () => {
    const browser = await puppeteer.launch({ headless: false });

    const searchTerm = "subwoofer";
    const numPagesOverride = 2;
    const numResultsOverride = 40;

    data.gc = await gcsurplus(browser)(numPagesOverride);
    data.bunz = await bunz(numPagesOverride);
    data.kijiji = await kijiji(browser)(searchTerm, numPagesOverride);
    data.fbMarketplace = await fbMarketplace(browser)(searchTerm, numResultsOverride);
};

const filter = async () => {
    const results = [];
    keywords.forEach(keyword => {
        const gc = data.gc.filter(data => 
            data.title.indexOf(keyword) > -1 || data.description.indexOf(keyword) > -1 );
        const bunz = data.gc.filter(data => 
                data.name.indexOf(keyword) > -1 || data.isolessDescription.indexOf(keyword) > -1 );
        const kijiji = data.gc.filter(data => 
                data.title.indexOf(keyword) > -1 || data.description.indexOf(keyword) > -1 );
        const fbMarketplace = data.gc.filter(data => 
            data.title.indexOf(keyword) > -1 || data.description.indexOf(keyword) > -1 );
        results.push(...gc, ...bunz, ...kijiji, ...fbMarketplace);
    });
    return results;
};