import { sleep } from "../utils";

const MAX_RESULTS_PER_PAGE = 30;

const requestResults = async (cursor, timesLoaded) => (await axios({
    method: 'post',
    url: "https://api.bunz.com/1.0/search/items/find",
    data: {
        filterKeyword:  "everyone",
        sort:           "created",
        acceptsBtz:     false, // true?
        limit:          MAX_RESULTS_PER_PAGE,
        distanceKM:     process.ENV.DEALSCOUT_DISTANCE,
        uuid:           process.ENV.DEALSCOUT_BUNZ_UUID,
        cursor:         cursor,
        coords:         [process.ENV.DEALSCOUT_LATITUDE,process.ENV.DEALSCOUT_LONGITUDE],
        timesLoaded: timesLoaded
    },
    headers: {
        "User-Agent": process.ENV.DEALSCOUT_USER_AGENT,
        "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://bunz.com/",
        "Content-Type": "application/json",
        "Bunz-Version": "v3.12.25",
        "Origin": "https://bunz.com",
        "DNT": 1,
        "Connection": "keep-alive",
        "Cookie": process.ENV.DEALSCOUT_BUNZ_COOKIE,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site"
    },
    validateStatus: null
    })).data;

export const scrape = db => async settings => {
    try {
        let timesLoaded, resultCount = 0;
        
        let response = await requestResults("initial", timesLoaded);
        resultCount = response.items.length;

        const previousResults = await db.query("SELECT * FROM bunz_results");

        // TODO check initial response items against previousResults and count how many new results there are
        if (0) {
            // TODO Increment settings.bunz.frequency by * 2, update settings.bunz.lastSearchedAt and exit
        }

        // TODO insert response.items into bunz_results        
        
        // Pagination
        const numResults = response.count;
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping Bunz with:\n
        result limit: ${settings.bunz.resultLimit}\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        `);

        // Iteration
        loop:
        while (response.isMore && response.error === 0) {
            if (settings.bunz.resultLimit && settings.bunz.resultLimit <= resultCount) break loop;   
            sleep(500);
            response = await requestData(response.cursor, timesLoaded);
            
            timesLoaded++;
            resultCount =+ response.items.length;
            
            console.log(timesLoaded, resultCount, response.isMore, response.error, response.cursor);
            
            // TODO insert into bunz_results
            // TODO insert into bunz_results
        }

        // TODO update settings.bunz.lastSearchedAt
    } catch (error) {
        console.error(error.message);
    }
}