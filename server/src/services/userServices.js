import loggerInit from '../utils/logger.js'; 
import { StockDetail } from "../models/userModel.js"; 
import { symbolToName } from '../utils/utils.js';
import { Article } from 'newspaperjs';
import finnhub from 'finnhub';
import {envConfig} from '../config/envConfig.js';
import { pipeline } from '@xenova/transformers';
import { cached } from '../utils/cache.js';
import { ingestArticles } from './ragClient.js';
const logger =loggerInit();
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = String(envConfig.finnhub ?? "");
const finnhubClient = new finnhub.DefaultApi();

const FINNHUB_NEWS_TTL_SECONDS = 15 * 60;


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

/** Finnhub company news, cached in Redis for 15 minutes per symbol and date range. */
export async function fetchCompanyNews(symbol, start_date, end_date) {
    return cached(`finnhub:news:${symbol}:${start_date}:${end_date}`, FINNHUB_NEWS_TTL_SECONDS, () =>
        new Promise((resolve, reject) => {
            finnhubClient.companyNews(symbol, start_date, end_date, (error, data) =>
                error ? reject(error) : resolve(data ?? [])
            );
        })
    );
}

/**
 * Fetch recent news for a symbol, scrape each article, store BART summaries
 * on the StockDetail document, and send the full article text to the RAG
 * service for indexing.
 */
export async function getNews(symbol,start_date,end_date){
    const { value: items, cached: fromCache, ms } = await fetchCompanyNews(symbol, start_date, end_date);
    logger.info(`Finnhub news ${symbol}: ${items.length} items (${fromCache ? "cache hit" : "API"}, ${ms} ms)`);

    const texts = await Promise.all(items.map((item) => articleParse(item.url)));
    const articles = [];
    texts.forEach((text, i) => {
        if (!text) return;
        const item = items[i];
        articles.push({
            symbol,
            title: item.headline || "",
            url: item.url,
            source: item.source || "",
            published_at: new Date((item.datetime || 0) * 1000).toISOString(),
            text,
        });
    });
    if (articles.length === 0) return { symbol, articles: 0 };

    await ingestArticles(articles);

    const summarized_resp = await summarizeArticles(articles.map((a) => a.text));
    try{
        await StockDetail.findOneAndUpdate(
            {symbol:symbol},
            {$set:{'news':summarized_resp,'updated_on':Date.now(),'symbol':symbol,'name':symbolToName[symbol] || symbol}},
            {upsert:true}
        );
        logger.info("Updated stock info:"+symbol);
    }
    catch(err)
    {
        logger.error("Error in updating stock info:"+err);
    }
    return { symbol, articles: articles.length };
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
                return result[0].summary_text;  // Extract summary text
            } catch (error) {
                console.error('Error summarizing article:', error.message);
                return '';  // Skip failed summaries
            }
        })
    );

    return summaries.join('\n\n');
}
