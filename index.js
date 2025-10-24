import puppeteer from 'puppeteer';
import { jobPortalURL } from './constants.js';


// Launch the browser and open a new blank page.
const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
});
const page = await browser.newPage();

// Navigate the page to a URL.
const pagePromise = await page.goto(jobPortalURL, {
    waitUntil: 'networkidle2',
    timeout: 60000
});

if (pagePromise) {
    console.log('Status:', pagePromise.status());
    console.log('URL:', pagePromise.url());
    console.log('Headers:', pagePromise.headers());

    // Get job by div id, select
    await page.waitForSelector('#WD9C');
    await page.$('#WD9C').then(el => el.click());

    // Search jobs
    await page.waitForSelector('#WDB0');
    await page.$('#WDB0').then(el => el.click());

} else {
    console.log('Page failed to load');
}