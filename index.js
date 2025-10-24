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
const pagePromise = await page.goto(jobPortalURL);

if(pagePromise) {
    console.log('Status:', pagePromise.status());
    console.log('URL:', pagePromise.url());
    console.log('Headers:', pagePromise.headers());
} else {
    console.log('Page failed to load');
}