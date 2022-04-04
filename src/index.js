import { scrape as gcsurplus } from "./gcsurplus.js";
import { scrape as bunz } from "./bunz.js";

// recurring task to scrape data and put into database
// maintain a list of filters to notify me of a possible deal


const keywords = ["amplifier", "subwoofer"];

const data = {
    bunz: [],
    gc: []
};

const scrape = async () => {
    const iterations = 2;
    data.gc = await gcsurplus(iterations);
    data.bunz = await bunz(iterations);

};

const filter = async () => {
    const results = [];
    keywords.forEach(keyword => {
        const gc = data.gc.filter(data => 
            data.title.indexOf(keyword) > -1 || data.description.indexOf(keyword) > -1 );
        const bunz = data.gc.filter(data => 
                data.name.indexOf(keyword) > -1 || data.isolessDescription.indexOf(keyword) > -1 );
    });

};