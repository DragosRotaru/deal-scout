export type ScraperSettings = {
    lastSearchedAt: string,
    frequency: number,
    resultLimit: number
};

export type Search = {
    id: number,
    term: string,
    resultLimit: number,
    timeLimit: string,
    budget: number,
    maxDistance: number,
    lowerPriceLimit: number,
    upperPriceLimit: number,
    keywords: string,
    kijijiFrequency: number,
    kijijiLastSearchedAt: string,
    fbmarketplaceFrequency: number,
    fbmarketplaceLastSearchedAt: string,
};