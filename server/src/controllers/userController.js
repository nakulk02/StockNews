import { User } from "../models/userModel.js"; 
import { StockDetail } from "../models/userModel.js"; 
import loggerInit from "../utils/logger.js";
import {envConfig} from "../config/envConfig.js";
import { generateToken } from "../middlewares/authMiddleware.js";
import { askRag } from "../services/ragClient.js";

const logger = loggerInit();
export async function login(req,res){
  try{
    const email=req.body['email'],password=req.body['passowrd'];
    const user =await User.findOne({email:email});
    if (!user) return res.status(401).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    const token = generateToken(user);
    
    res.json({token});
  }catch(error){
    logger.error(`Error logging in: ${error.message}`);
    res.status(500).json({ message: "Please try again" });
  }
}
export function startup(req,res)
{
  try{
    console.log("server running");
  }catch(error){
    logger.error(`Error logging in: ${error.message}`);
    res.status(500).json({ message: "Please try again" });
  }
}


export async function addUser (req,res){
  try {
    logger.info("Adding user all users...");
    const newUser=new User({"name":req.body['name'],
      "email":req.body['email'],
      "password":req.body['password']
    });
    await newUser.save();
} catch (error) {
    logger.error(`Error adding user: ${error.message}`);
    res.status(500).json({ message: "Error adding user" });
}

}

export async function fetchStockInfo (req,res){
  try{
    const symbol=req.params.stock;
    const stockdetail=await StockDetail.findOne({symbol:symbol})
    if(stockdetail){
      res.json(stockdetail);
    }
    else
    {
      logger.info("No such stock symbol found");
      res.status(404).json({message:"No such symbol found"});
    }
  }
  catch(error)
  {
    logger.error(`Error fetching stock data: ${error.message}`);
    res.status(500).json({ message: "Error fetching stock data" });
  }
}

export async function fetchStockList (req,res){
  try{
      const stocklist=await StockDetail.find().select("name symbol icon");
      res.json(stocklist);
    }
    catch(error)
    {
      logger.error(`Error fetching stock list: ${error.message}`);
      res.status(500).json({ message: "Error fetching stock list" });
    }
}


export async function getUsers (req, res) {
    try {
        logger.info("Fetching all users...");
        const users = await User.find();
        logger.info(`Fetched ${users.length} users.`);
        res.json(users);
    } catch (error) {
        logger.error(`Error fetching users: ${error.message}`);
        res.status(500).json({ message: "Error fetching users" });
    }
};

const SYMBOL_RE = /^[A-Z.]{1,10}$/;

/**
 * POST /api/stocks/:symbol/ask  { question, days? }
 * Proxies to the RAG service's /query and returns a cited answer.
 */
export async function askStock(req, res) {
  const symbol = String(req.params.symbol || "").toUpperCase();
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const days = Number.isInteger(req.body?.days) ? req.body.days : undefined;

  if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ message: "Invalid stock symbol" });
  if (question.length < 3 || question.length > 1000) {
    return res.status(400).json({ message: "question must be 3-1000 characters" });
  }

  try {
    const result = await askRag({ symbol, question, days });
    logger.info(`ask ${symbol}: cached=${result.cached} citations=${result.citations.length} ${result.latency_ms} ms`);
    res.json(result);
  } catch (error) {
    const status = error.response?.status;
    logger.error(`RAG query failed for ${symbol}: ${error.message}`);
    if (status === 422) return res.status(400).json({ message: "Invalid question" });
    res.status(502).json({ message: "The news Q&A service is unavailable. Please try again later." });
  }
}
