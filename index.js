import puppeteer from 'puppeteer';
import { jobPortalURL, jobDivIds } from './constants.js';
import { JSDOM } from "jsdom";
import path from 'path';
import axios from 'axios';
import fs from 'fs';
import { error } from 'console';

const downloadPath = path.resolve('./jobPostPdf');


// Launch the browser and open a new blank page.
const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
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
    const job = 'delivery-jobs'; // For testing purposes
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
        //console.log('Table object: ',table)

        if (table) {
            //console.log("Table exists!!");
            const tableHTML = await page.evaluate(el => el.outerHTML, table);
  
            // Create dom tree for data extraction
            const dom = new JSDOM("");
            const DOMParser = dom.window.DOMParser;
            const parser = new DOMParser();

            const doc = parser.parseFromString(tableHTML, 'text/html').querySelector('table');

            const rows = doc.querySelectorAll('tr');

            const jobListing = [];

            // Get node data from rows dom
            for (let x = 0; x < rows.length; x++) {
                const cells = rows[x].querySelectorAll('td');

                cells.forEach(cell => {
                    //console.log('Cell: ',cell)
                    jobListing.push(cell.textContent.trim());
                });
            }
            //console.log('Cells List: ', jobListing);
            
            // Clean data and structure it
            const tableHeaders = [...jobListing.slice(0, 4)];
            const tableList = jobListing.slice(8, jobListing.length).filter(val => val !== '100.00'); // Removes match value for data consistency across domain specific job post results

            const errorMsg = jobListing[9]
            if (errorMsg === 'The table does not contain any data') throw new Error('The table does not contain any data')

            // Create list of structured job posting
            const structureJobPosts = async (tableHeaders,tableList) => {
                try {
                    const structuredJobList = [];
                    //console.log('Table list: ', tableList);
                    for (let i = 0; i < tableList.length - 1; i += 4) {
                        const dataEntry = tableList;
                        
                        //console.log('DataEntry: ', dataEntry);
                        const stringEntry = dataEntry[i + 1];
                        if (dataEntry[i] === '' && stringEntry.length !== 0 ) {
                            //console.log('Loop Entry: ', dataEntry);
                            // Get ordered data columns, then add to index

                            // const extractLinkPageURL = async () => {
                            //     const linkId =  linkListings[linkIndex].linkNode.getAttribute('id')

                            //     await page.click(`#${linkId}`);

                            //     await page.waitForSelector(jobDivIds[job].jobTableId)

                            // }
                            //  await extractLinkPageURL()
                            //console.log('hRef: ', await extractLinkPageURL())
                            const jobTitle = dataEntry[i + 1];
                            const jobType = dataEntry[i + 2];
                            const postDate = dataEntry[i + 3];
                            const jobMetaData = jobTitle.split(' ');
                            const jobId = jobMetaData.pop();
                            const state = jobMetaData.pop();
                            const city = jobMetaData.pop();

                            const structuredRow = {
                                [tableHeaders[0]]: jobTitle, // job
                                [tableHeaders[1]]: jobType, // type
                                [tableHeaders[2]]: postDate, // Post Date
                                'jobId': jobId,
                                'state': state,
                                'city': city
                            };

                            structuredJobList.push(structuredRow);
                            //console.log(structuredJobList);
                        }
                    }
                    return structuredJobList;
                } catch(e) {
                    console.error('Structure job post algorithm error: ',e)
                } finally { // Kill browser
                    await browser.close();
                }
                
            };
            const metaDataProducer = async (tableHeaders, tableList, structureJobPosts) => {
                const data = await structureJobPosts(tableHeaders, tableList);
                if(!data) {
                    return null
                }
                return data
            } 
            const jobPostData = async (tableHeaders, tableList, structureJobPosts) => await metaDataProducer(tableHeaders, tableList,structureJobPosts)

            const results = await jobPostData(tableHeaders, tableList, structureJobPosts)
            
            // Send payload to n8n instance
            const webhookURL = process.env.N8N_WEBHOOK_URL
            if (typeof webhookURL !== 'string') throw new Error('No webhook URL found')

            if (webhookURL && results) {
                try {
                    const response = await axios.post(webhookURL, {
                        jobs: results,
                        timestamp: new Date().toISOString(),
                        source: 'github-actions-usps-scraper'
                    });
                    console.log('Successfully sent to n8n:', response.status);
                } catch (error) {
                    console.error('Failed to send to n8n:', error.message);
                }
            }

            console.log(results);
            
        }

    } catch (err) {
        console.error('Issues parsing table html: ', err);
        if (err instanceof Error && err.message === 'The table does not contain any data') {
            console.error('No jobs available!! :(');
        }
    } finally { // Kill browser
        await browser.close();
    }
    console.log('End of process');

} else {
    console.log('Page failed to load');
}