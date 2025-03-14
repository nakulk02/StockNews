import loggerInit from '../utils/logger.js'; 
import { StockDetail } from "../models/userModel.js"; 
import { symbolToName } from '../utils/utils.js';
import { Article } from 'newspaperjs';
import finnhub from 'finnhub';
import {envConfig} from '../config/envConfig.js';
const logger =loggerInit();
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = envConfig.finnhub.toString();
const finnhubClient = new finnhub.DefaultApi();
import { pipeline } from '@xenova/transformers';


async function articleParse(url)
{
    try{
        // Starting with got v12, got is ESM-only and no longer supports require() directly.
        const got = await import('got').then((m) => m.default); // Dynamic import
        //This is used to tackle the redirection issue in finnhub. I think what they do is just set some cookies for accessing the redirection sites.
        const initialResponse = await got(url, {
            followRedirect: false 
        });
        let redirectedUrl = initialResponse.headers.location;
        if (!redirectedUrl) {
            redirectedUrl=url;
        }
        let {text}=await Article(url);
        return text;
    }
    catch(err){     
        logger.error("Error parsing the article:"+err);
        return null;
    }
}

const price=[{
    "2025-03-13":{
        "c": 261.74,
        "h": 263.31,
        "l": 260.68,
        "o": 261.07,
        "pc": 259.45,
        "t": 1582641000 
      },
      "2025-03-13":{
        "c": 241.74,
        "h": 213.31,
        "l": 250.68,
        "o": 261.07,
        "pc": 259.45,
        "t": 1582641000 
      },"2025-03-13":{
        "c": 161.74,
        "h": 163.31,
        "l": 160.68,
        "o": 261.07,
        "pc": 259.45,
        "t": 1582641000 
      },"2025-03-13":{
        "c": 261.74,
        "h": 263.31,
        "l": 260.68,
        "o": 261.07,
        "pc": 259.45,
        "t": 1582641000 
      },"2025-03-13":{
        "c": 261.74,
        "h": 263.31,
        "l": 260.68,
        "o": 261.07,
        "pc": 259.45,
        "t": 1582641000 
      }
}]




export async function getNews(symbol,start_date,end_date){
    finnhubClient.companyNews(symbol, start_date,end_date, async(error, data, response) => {
        const urlList=[];
        for(let entry in data){
            urlList.push(data[entry].url)
        }
        const results=await Promise.all(urlList.map(articleParse));
        const cleanResult =[];
        for( let index in results)
        {
            if(results[index]===null)
            {
                continue;
            }
            cleanResult.push(results[index]);
        }
        if(cleanResult.length>0)
        {
            const summarized_resp= await summarizeArticles(cleanResult);
            try{
                const result=await StockDetail.findOneAndUpdate({symbol:symbol},{$set:{'news':summarized_resp,'updated_on':Date.now(),'symbol':symbol,'name':symbolToName["symbol"]}},{upsert:true});
                logger.info("Updated stock info:"+symbol);
            }
            catch(err)
            {
                logger.error("Error in updating stock info:"+err);
            }
        }
    });
}

let summarizer;

async function loadModel() {
    summarizer = await pipeline('summarization', 'Xenova/bart-large-cnn'); 
}

async function summarizeArticles(articles) {
    if (!summarizer) await loadModel(); 

    const summaries = await Promise.all(
        articles.map(async (article) => {
            try {
                const result = await summarizer(article, {
                    max_length: 500,  
                    min_length: 200,   
                    do_sample: false  // Ensures deterministic results
                });
                console.log(result)
                return result[0].summary_text;  // Extract summary text
            } catch (error) {
                console.error('Error summarizing article:', error.message);
                return '';  // Skip failed summaries
            }
        })
    );

    console.log(' Combined Summary:\n', summaries.join('\n\n'));
    return summaries.join('\n\n');
}
