import puppeteer from 'puppeteer';
import { jobPortalURL,jobDivIds } from './constants.js';


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
    const jobTitleId = jobDivIds['delivery-jobs'].jobTitleId
    await page.waitForSelector(jobTitleId);
    await page.$(jobTitleId).then(el => el.click());

    // Search jobs
    await page.waitForSelector('#WDB0');
    await page.$('#WDB0').then(el => el.click());

    // Look for results
    await page.waitForSelector('#WDEB')
    const searchResult = await page.$eval('#WDEB', el => el.textContent.trim());
    const spanContent = searchResult.split(':')[1].trim()
    const hits = parseInt(spanContent.split(' ')[0])
    
    // Handle hit results
    if(hits > 0 ) {
        console.log('There are jobs!!')
    } else {
        console.log('There are no jobs :(')
    }

} else {
    console.log('Page failed to load');
}