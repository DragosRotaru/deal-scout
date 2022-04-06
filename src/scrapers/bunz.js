import { sleep } from "../utils";

const MAX_RESULTS_PER_PAGE = 30;

const requestData = async (cursor, timesLoaded) => {
    const response = await axios({
        method: 'post',
        url: "https://api.bunz.com/1.0/search/items/find",
        data: {
            filterKeyword:  "everyone",
            sort:           "created",
            acceptsBtz:     false, // true?
            limit:          MAX_RESULTS_PER_PAGE,
            distanceKM:     20,
            uuid:           process.ENV.BUNZ_UUID,
            cursor:         cursor,
            coords:         [process.ENV.LATITUDE,process.ENV.LONGITUDE],
            timesLoaded: timesLoaded
        },
        headers: {
            "Host": "api.bunz.com",
            "User-Agent": process.ENV.USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://bunz.com/",
            "Content-Type": "application/json",
            "Bunz-Version": "v3.12.25",
            "Origin": "https://bunz.com",
            "Content-Length": 189,
            "DNT": 1,
            "Connection": "keep-alive",
            "Cookie": process.ENV.BUNZ_COOKIE,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site"
        },
        validateStatus: null
      });
      return response.data;
}

export const scrape = async numPagesOverride => {
    // Data
    const results = [];
    try {
        // Initial State
        let response = await requestData("initial", timesLoaded);
        results.push(...response.items);
        
        // Pagination
        const timesLoaded = 0;
        const numResults = response.count;
        const numPages = Math.ceil(numResults / MAX_RESULTS_PER_PAGE);

        console.log(`Scraping Bunz with:\n
        results per page: ${MAX_RESULTS_PER_PAGE}\n
        number of results: ${numResults}\n
        number of pages: ${numPages}\n
        page override: ${numPagesOverride}\n
        `);

        // Iteration
        while (response.isMore && response.error === 0 && (!numPagesOverride || timesLoaded < numPagesOverride)) {
            console.log(timesLoaded, response.isMore, response.error, response.cursor);
            sleep(500);
            timesLoaded++;
            const response = await requestData(response.cursor, timesLoaded);
            results.push(...response.items);
        }
    
        // Return and close
        return results;

    } catch (error) {
        console.log(error.message);
        return results; 
    }
}