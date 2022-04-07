import puppeteer from "puppeteer";
import { Client } from 'pg';
import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR } from "./utils";
import { gcsurplus, bunz, kijiji, fbMarketplace } from "./scrapers";


const scrape = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const client = new Client();
    await client.connect();

    const searches = await client.query("SELECT * FROM searches");
    for (let searchIndex = 0; searchIndex < searches.rowCount; searchIndex++) {
        const search = searches.rows[searchIndex];
        const createdAt = new Date(search.createdAt).getTime();
        const dueDate = new Date().setTime(createdAt + (search.timeLimit * MILLISECONDS_PER_DAY));
        const now = new Date().getTime();

        if (now > dueDate) {
            console.log("due date passed, skipping search:", search.term);
        } else {
            if (now < new Date(search.kijijiLastSearchedAt).getTime() + (search.kijijiFrequency * MILLISECONDS_PER_HOUR)) {
                console.log("skipping kijiji:", search.term);
            } else {
                await kijiji(browser, client)(search);
            }
            if (now < new Date(search.fbmarketplaceLastSearchedAt).getTime() + (search.fbmarketplaceFrequency * MILLISECONDS_PER_HOUR)) {
                console.log("skipping fb marketplace:", search.term);
            } else {
                await fbMarketplace(browser, client)(search);
            }
        }
    }

    const now = new Date().getTime();
    const settings = {
        bunz: {
            lastSearchedAt: "",
            frequency: 1,
            resultLimit: 0
        },
        gcsurplus: {
            lastSearchedAt: "",
            frequency: 1,
            resultLimit: 10
        }
    };

    // TODO Grab Settings from a json File
    if (now < new Date(settings.bunz.lastSearchedAt).getTime() + (settings.bunz.frequency * MILLISECONDS_PER_HOUR)) {
        console.log("skipping bunz");
    } else {
        //await bunz(client)(settings.bunz);
    }
    if (now < new Date(settings.gcsurplus.lastSearchedAt).getTime() + (settings.gcsurplus.frequency * MILLISECONDS_PER_HOUR)) {
        console.log("skipping gc surplus");
    } else {
        await gcsurplus(browser, client)(settings.gcsurplus);
    }

    await browser.close();
    await client.end();
};

scrape();