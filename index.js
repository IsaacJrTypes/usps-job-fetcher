import puppeteer from 'puppeteer';
import { jobPortalURL, jobDivIds } from './constants.js';
import { JSDOM } from "jsdom";
import path from 'path';
import fs from 'fs';

const downloadPath = path.resolve('./jobPostPdf');


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
    const job = 'delivery-jobs';
    //const job = 'it-jobs';
    const jobTitleId = jobDivIds[job].jobTitleId;
    await page.waitForSelector(jobTitleId);
    await page.$(jobTitleId).then(el => el.click());

    // Search jobs
    await page.waitForSelector('#WDB0');
    await page.$('#WDB0').then(el => el.click());

    // Look for results
    try {
        const jobResultId = jobDivIds[job].jobResultId;
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
        console.error('Error getting result header for parsing');
    }

    try {
        // Handle parsing table to object

        const jobTableClass = '.urST3BdBrd.urST3Bd.urFontStd';
        await page.waitForSelector(jobTableClass);
        const table = await page.$(jobTableClass);

        if (table) {
            console.log("Table exists!!");
            const tableHTML = await page.evaluate(el => el.outerHTML, table);
            //console.log(tableHTML)
            console.log(typeof tableHTML);
            // Create dom tree for data extraction
            const dom = new JSDOM("");
            const DOMParser = dom.window.DOMParser;
            const parser = new DOMParser();

            const doc = parser.parseFromString(tableHTML, 'text/html').querySelector('table');

            const rows = doc.querySelectorAll('tr');


            const jobListing = [];
            const linkListings = [];

            // Get node data from rows dom
            for (let x = 0; x < rows.length; x++) {
                const cells = rows[x].querySelectorAll('td');
                // const linkNode = rows[x].querySelector('a') != null ? rows[x].querySelector('a') : false;


                cells.forEach(cell => {
                    jobListing.push(cell.textContent.trim());
                });
                // if (linkNode !== false) {
                //console.log('found node: ',linkNode )
                //     linkListings.push({ linkNode: linkNode });
                // }
            }

            jobListing.forEach((val, i) => console.log(val, ": ", i));
            // Clean data and structure it
            const tableHeaders = [...jobListing.slice(0, 4)];
            const tableList = jobListing.slice(8, jobListing.length);
            // console.log(tableHeaders)
            console.log(tableList);

            // Create job labels using index
            const labelObj = () => {
                const obj = {}
                const labels = tableHeaders.forEach((val, i) => {
                    const title = val;
                    obj[i] = title;
                });
                return labels
            };
            

            // console.log("Labels", JSON.stringify(labels));


            // Create list of structured job posting
            const structureJobPosts = async (tableList) => {
                let linkIndex = 0; // linkListing contains all valid job link nodes
                const structuredJobList = [];
                for (let i = 0; i < tableList.length - 1; i+= 5) {
                    const dataEntry = tableList[i];
                    if (dataEntry === '') {
                        // Get ordered data columns, then add to index
                        
                        // const extractLinkPageURL = async () => {
                        //     const linkId =  linkListings[linkIndex].linkNode.getAttribute('id')

                        //     await page.click(`#${linkId}`);

                        //     await page.waitForSelector(jobDivIds[job].jobTableId)

                        // }
                        //  await extractLinkPageURL()
                        //console.log('hRef: ', await extractLinkPageURL())

                        const structuredRow = {
                            [[labelObj[0]]]: tableList[i + 1],
                            [[labelObj[1]]]: tableList[i + 2],
                            [[labelObj[2]]]: tableList[i + 3],
                            [[labelObj[3]]]: tableList[i + 4],
                        };

                        structuredJobList.push(structuredRow);
                        console.log(structuredJobList)
                    }
                }
                return structuredJobList;
            };
            console.log('Structured posts: ',await structureJobPosts(tableList));
        }


    } catch (err) {
        console.error('Issues parsing table html: ', err);
    }
    console.log('End of process');

} else {
    console.log('Page failed to load');
}