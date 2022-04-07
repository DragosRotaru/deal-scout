import { Page } from "puppeteer";

export const MILLISECONDS_PER_MIN = 60 * 1000;
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MIN;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const scrapeInnerTextHOF = (page: Page) => async (selector: string) => page.evaluate(e => e.textContent, await page.waitForSelector(selector));

export const stripURLParams = (url: string): string => url.split("?")[0] as string;

export const filterUnique = <T>(array: T[]): T[] => [...new Set(array)];