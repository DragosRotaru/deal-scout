/* 

We know generally that deal identification is a function of:

- price 
- travel distance
- qualitative aspects of the item
- the patience the deal seeker has to find the right deal
- the price sensitivity or the price to deal preference of the deal seeker
- how each factor compares in relation to the overall market

*/

const search = {
    term: "subwoofer",
    keywords: [ // AND
        ['10"', '12"', '14"', '15"', '16"', '18"'], // OR
        ["Brand A", "Brand B", "Brand C"], // OR
    ],
    expectedPrice: {
        lower: 100 , // dollars
        upper: 1000 // dollars
    },
    budget: 200, // dollars
    travelBudget: 60, // km
    patience: 10, // weeks
    startedAt: 10, // weeks
    budgetToDealPreference: 0.5 // 0 - 1
};

/* 

market: [1/0,1/0,1/0,1/0]
price: [0, inf] where lower is better
distance: [0, inf] where lower is better
foundAt: Date where later is better

Derived:

timeInSearch [0, 1] where higher is better
priceInRange: 0/1 where 1 is better
budgetDelta: [-inf, +inf] where higher is better
travelBudgetDelta: [-inf, +inf] where higher is better

Normed:

normedPrice: [0,1] where higher is better
normedDistance: [0,1] where higher  is better
normedTimeInSearch: [0,1] where higher is better
normedPriceInRange: [0,1] where higher is better
normedBudgetDelta: [0,1] where higher is better
normedTravelBudgetDelta: [0,1] where higher is better

- We can also get the budget delta as a percentage of the budget, normalizing it to both the magnitude of the budget and the market
- We want a function that will take these parameters and output a ranking, [0,1]
- we need inputs to indicate qualitative aspects


1. We provide the scraper with this info, it begins to collect data
2. There is a default general model which outlives wishlist items and is used to initialize the model for each new search
3. Our model has 6 inputs
4. We provide labelling by swiping left or right on alerts
5. we initialize the model with budgetToDealPreference, preferring normedBudgetDelta

*/

const preProcess = results => results
    .filter(r => r.search(search.term)) // filter out by search term
    .filter(r => r.searchAnyOf(search.keywords[0]) && r.searchAnyOf(search.keywords[1])) // filter out by keywords
    .map(r => ({ ...r, priceInRange: r.price > search.expectedPrice.lower && r.price < search.expectedPrice.upper ? 1 : 0 })) // price is in expected range
    .map(r => ({ ...r, budgetDelta: -1 * (r.price - search.budget) })) // price distance from budget
    .map(r => ({ ...r, travelBudgetDelta: -1 * (r.distance - search.travelBudget) })) // travel distance distance from travel budget
    .map(r => ({ ...r, timeInSearch: (r.foundAt - search.startedAt) / search.patience })); // % of the way through the search


const normalize = results => results
    .map(r => ({ ...r, normedPriceInRange: r.priceInRange / results.filter(r => r.priceInRange === 1).length })) // how exceptional is it that it is in range?