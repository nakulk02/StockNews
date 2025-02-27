const logger = require("../utils/logger");
const stockDetail= require("../models/userModel");
const {symbolToName} = require("../utils/utils");
const Article=require('newspaperjs').Article;
const finnhub=require('finnhub');
const dotenv = require("dotenv");
const Groq=require('groq-sdk');
const groq= new Groq({apiKey:process.env.GROQ_API_KEY});
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB.toString();
const finnhubClient = new finnhub.DefaultApi()

dotenv.config();

async function articleParse(url){
    try{

        let {text}=await Article(url);
        logger.info("Text parsed for url:"+url);
        return text;
    }
    catch(err){
        logger.error("Error parsing the article:"+err);
    }
}

async function getNews(symbol,start_date,end_date){
finnhubClient.companyNews(symbol, start_date,end_date, async(error, data, response) => {
    const urlList=[];
    for(let entry in data){
        urlList.push(data[entry].url)
    }
    const results=await Promise.all(urlList.map(articleParse));
    const cleanResult =[];
    for( let index in results)
    {
        if(results[index]==undefined)
        {
            continue;
        }
        cleanResult.push(results[index]);
    }
    console.log(cleanResult);
    if(cleanResult.length>0)
    {
        const summarized_resp= await getGroqRes({"list":cleanResult});
        console.log(summarized_resp)
        const summarized_result=summarized_resp.data;
        try{
            logger.info("Updated stock info:"+symbol);
            const result=await stockDetail.findOneAndUpdate({symbol:symbol},{$set:{'news':summarized_result,'updated_on':Date.now(),'symbol':symbol,'name':symbolToName["symbol"]}},{upsert:true});
        }
        catch(err)
        {
            logger.error("Error in updating stock info:"+err);
        }
    }
});
}

        

async function getGroqRes(req,res){
    try {
        const temp={
            "messages":[
                {
                    "role": "system",
                    "content": "You are a helpful AI that summarizes text concisely."
                },
                {
                    "role": "user",
                    "content": `summarize the text in the list:${req["list"]}`
                }
                ],
                    "model": "llama3-8b-8192",
                    "temperature": 1,
                    "top_p": 1,
                    "stream": true,
                    "stop": null
                }
        const chatCompletion = await groq.chat.completions.create(temp);
    
        res.setHeader('Content-Type', 'text/plain');
        for await (const chunk of chatCompletion) {
          res.write(chunk.choices[0]?.delta?.content || '');
        }
        logger.info("Text summarized");
        res.end();
      } catch (error) {
        logger.error("Error in querying:"+err);
        res.status(500).send('Internal Server Error');
      }
}