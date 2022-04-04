const sleep = ms => new Promise(r => setTimeout(r, ms));

const requestData = async (cursor, timesLoaded) => {
    const response = await axios({
        method: 'post',
        url: "https://api.bunz.com/1.0/search/items/find",
        data: {
            filterKeyword:  "everyone",
            sort:           "created",
            acceptsBtz:     false, // true?
            limit:          30,
            distanceKM:     20,
            uuid:           process.ENV.BUNZ_UUID,
            cursor:         cursor,
            coords:         [process.ENV.LAT,process.ENV.LNG],
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

const scrape = async (numPagesOverride) => {
    const data = [];
    const timesLoaded = 0;

    try {
        let response = await requestData("initial", timesLoaded);
        data.push(...response.items);
    
        while (response.isMore && response.error === 0 && (!numPagesOverride || timesLoaded < numPagesOverride)) {
            console.log(timesLoaded, response.isMore, response.error, response.cursor);
            sleep(500);
            timesLoaded++;
            const response = await requestData(response.cursor, timesLoaded);
            data.push(...response.items);
        }
    
        return data;   
    } catch (error) {
        console.log(error.message);
        return data; 
    }
}