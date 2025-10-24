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
    const job = 'delivery-jobs'
    const jobTitleId = jobDivIds[job].jobTitleId
    await page.waitForSelector(jobTitleId);
    await page.$(jobTitleId).then(el => el.click());

    // Search jobs
    await page.waitForSelector('#WDB0');
    await page.$('#WDB0').then(el => el.click());

    // Look for results
    try {
        const jobResultId = jobDivIds[job].jobResultId
        await page.waitForSelector(jobResultId);
        const searchResult = await page.$eval(jobResultId, el => el.textContent.trim());
        const spanContent = searchResult.split(':')[1].trim();
        const hits = parseInt(spanContent.split(' ')[0]);

        // Handle hit results
        if (hits > 0) {
            console.log(`There are jobs!! Result: ${hits}`);
        } else {
            console.log('There are no jobs :(');
        }
    } catch {
        console.error('Error getting result header for parsing')
    }
    
    try {
        // Handle parsing table to object
        
        const jobTableClass = '.urST3BdBrd.urST3Bd.urFontStd'
        await page.waitForSelector(jobTableClass)
        const table = await page.$(jobTableClass);

        if(table) {
            console.log("Table exists!!")
            const tableHTML = await page.evaluate(el => el.outerHTML, table)
            console.log(tableHTML)
        }
    } catch {
        console.error('Issues parsing table html')
    }
    console.log('End of process')

} else {
    console.log('Page failed to load');
}