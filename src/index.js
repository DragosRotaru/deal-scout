import { scrape as bunz } from "./bunz.js";
import { scrape as gcsurplus } from "./gcsurplus.js";
import { scrape as kijiji } from "./kijiji.js";

const keywords = ["subwoofer"];

const data = {
    bunz: [],
    gc: [],
    kijiji: []
};

const scrape = async () => {
    const iterations = 2;
    data.gc = await gcsurplus(iterations);
    data.bunz = await bunz(iterations);
    // TODO iterate over keywords
    data.kijiji = await kijiji(iterations, keywords[0]);
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
        results.push(...gc, ...bunz, ...kijiji);
    });
    return results;
};