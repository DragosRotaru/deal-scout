# DealScout

if one were to provide DealScout with a wishlist of items, it would theoretically continuously monitor second hand marketplaces to find you potential deals.

## Supported Marketplaces

- GC Surplus
- Bunz
- Kijiji
- Facebook Marketplace

## TODOs
- "Hobart L-800 Mixer and Related Accessories" - GCSurplus Example Broken
- check if the scrapers work
- fail gracefully at the result level
- write an adaptive recurring scrape job
    - stop when you reach items already scraped
    - monitor frequency of new posts for each wishlist search
- test by creating posts with known data
- deal with long descriptions on FB
- deal with long descriptions on Kijiji
- filter results by checking city distance from LATITUDE and LONGITUDE
- translate descriptions
- add persistance: results, wishlist, scoring models
- add alerts and labeling input from user

## Copyright

DealScout Copyright (C) 2022 Dragos Rotaru

This work is STRICTLY FOR EDUCATIONAL PURPOSES only. No warranties or guarantees are made. Under no circumstances, should this work be used for any commercial purpose.

You may not use, execute, copy, alter, modify, share or redistribute the work contained within  without my express written consent.

I am not responsible for any breach of Terms of any agreement made between you and any third party, including but not limited to the entities that own and/or operate the websites which this program is made to interact with and/or collect data from. The websites in question are bunz.com, gcsurplus.ca, facebook.com and kijiji.ca. The entities which own and/or operate the above websites may include but are not limited to Meta inc., Kijiji Canada Ltd, 2745091 Ontario Inc, Public Services and Procurement Canada. Please abide by their Terms of Service, EULA and any other agreements they have, and please respect their rights of ownership over the data contained on their websites. Do not use this software to violate any laws in any juristiction, or the rights of any third party.
