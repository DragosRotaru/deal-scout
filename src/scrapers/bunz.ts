import { Client } from "pg";
import axios from "axios";
import { sleep } from "../utils";
import { ScraperSettings } from "../types";

type Result = {
    id: string,
    url: string,
    title: string,
    postedAt: string,
    scrapedAt: string,
    location: string,
    description: string
}

const MAX_RESULTS_PER_PAGE: number = 30;
const SLEEP_TIME: number = 500;

const requestResults = async (cursor: string, timesLoaded: number): Promise<any> => (await axios({
    method: "POST",
    url: "https://api.bunz.com/1.0/search/items/find",
    data: {
        filterKeyword:  "everyone",
        sort:           "created",
        acceptsBtz:     false, // true?
        limit:          MAX_RESULTS_PER_PAGE,
        distanceKM:     process.env['DEALSCOUT_DISTANCE'],
        uuid:           process.env['DEALSCOUT_BUNZ_UUID'],
        cursor:         cursor,
        coords:         [process.env['DEALSCOUT_LATITUDE'], process.env['DEALSCOUT_LONGITUDE']],
        timesLoaded: timesLoaded
    },
    headers: {
        "User-Agent": process.env['DEALSCOUT_USER_AGENT'] || "",
        "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://bunz.com/",
        "Content-Type": "application/json",
        "Bunz-Version": "v3.12.25",
        "Origin": "https://bunz.com",
        "DNT": "1",
        "Connection": "keep-alive",
        "Cookie": process.env['DEALSCOUT_BUNZ_COOKIE'] || "",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site"
    },
    validateStatus: () => true
    })).data;

const insertIntoDB = (db: Client) => async (response: any): Promise<void> => {
    for (let resultIndex = 0; resultIndex < response.items.length; resultIndex++) {
        const result = response.items[resultIndex];
        await db.query(`INSERT into bunz_results(
            id,
            url,
            title,
            postedAt,
            scrapedAt,
            location,
            description
            ) Values($1, $2, $3, $4, $5, $6, $7)  ON CONFLICT (id) DO NOTHING`, [
            result._id,
            result.slug,
            result.title,
            result.created,
            new Date().toISOString(),
            `${result.location[0]},${result.location[1]}`,
            result.description,
        ])
    }
}

export const scrape = (db: Client) => async (settings: ScraperSettings): Promise<void> => {
    try {
        let timesLoaded: number = 0;
        let resultCount: number = 0;
        
        let response = await requestResults("initial", timesLoaded);
        resultCount = response.items.length;

        const previousResults = await db.query("SELECT * FROM bunz_results");

        // TODO check initial response items against previousResults and count how many new results there are
        if (0) {
            settings.lastSearchedAt = new Date().toISOString();
            settings.frequency = settings.frequency * 2;
            // TODO persist settings
            return;
        }

        await insertIntoDB(response);
        
        // Pagination
        const numResults: number = response.count;
        const numPages: number = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping Bunz with:\n
        result limit: ${settings.resultLimit}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        `);

        // Iteration
        loop:
        while (response.isMore && response.error === 0) {
            if (settings.resultLimit && settings.resultLimit <= resultCount) break loop;   
            sleep(SLEEP_TIME);
            response = await requestResults(response.cursor, timesLoaded);
            
            timesLoaded++;
            resultCount =+ response.items.length;
            
            console.log(timesLoaded, resultCount, response.isMore, response.error, response.cursor);
            await insertIntoDB(response);
        }
        settings.lastSearchedAt = new Date().toISOString();
        // TODO persist settings
    } catch (error: any) {
        console.error(error.message);
    }
}