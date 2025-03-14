import express from "express";
import cors from "cors";
import morgan from "morgan";
import loggerInit from "./src/utils/logger.js";
import {router} from "./src/routes/userRoutes.js";
import cron from "node-cron";
import {connectDB} from "./src/config/db.js";
import mongoose from "mongoose";
import { symbolToName } from "./src/utils/utils.js";
import { getNews } from './src/services/userServices.js';
import {envConfig} from './src/config/envConfig.js';


connectDB();

const app = express();
app.use(express.json());
app.use(cors(
    {
        origin: "http://localhost:3000",  // Exact frontend origin
        credentials: true     
    }
));

const logger = loggerInit();
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

app.use("/api", router);


cron.schedule("0 * * * *", async() => {
    // await updateNews();
    console.log("Task running every hour:", new Date());
    
});


async function updateNews(){
    const current_date = new Date();
    let prev_date= new Date();
    prev_date.setDate(prev_date.getDate()-5);
    let current_day=current_date.getDate(),current_year=current_date.getFullYear(),prev_day=prev_date.getDate(),prev_year=prev_date.getFullYear();
    let current_month=current_date.getMonth()+1,prev_month=prev_date.getMonth()+1;
    if(current_month<10)
    {
        current_month="0"+current_month;
    }
    if(prev_month<10)
    {
        prev_month="0"+prev_month;
    }
    if(current_day<10)
    {
        current_day="0"+current_day;
    }
    if(prev_day<10)
    {
        prev_day="0"+prev_day;
    }
    const start_date=prev_year+"-"+prev_month+"-"+prev_day,end_date=current_year+"-"+current_month+"-"+current_day;
    try{
        for(const symbol in symbolToName)
        {
            await getNews(symbol,start_date,end_date);
        }
    }
    catch(err){
        logger.error("Encountered error:"+err);
    }
}


app.use((err, req, res, next) => {
    logger.error(`${err.message} - ${req.method} ${req.url}`);
    res.status(500).json({ message: "Server Error" });
});

const PORT = envConfig.port || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    logger.info(`Server running on port ${PORT}`);
});

// console.log("get news start");

// getNews("TSLA","2025-03-09","2025-03-10")
// .then(res=>console.log(res))
// .catch(err=>{
//     console.log("idahr err");
//     console.log(err);
// })
// .finally(()=>{
//     console.log("has run");
// })
// console.log("get news end");