const {user,stockDetail} = require("../models/userModel");
const logger = require("../utils/logger");
const Groq=require('groq-sdk');
const groq= new Groq({apiKey:process.env.GROQ_API_KEY});
const {generateToken}=require("../middlewares/authMiddleware");


const login=async(req,res)=>{
  try{
    const email=req.body['email'],password=req.body['passowrd'];
    const user =await user.findOne({email:email});
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


const addUser=async (req,res)=>{
  try {
    logger.info("Adding user all users...");
    const newUser=new user({"name":req.body['name'],
      "email":req.body['email'],
      "password":req.body['password']
    });
    await newUser.save();
} catch (error) {
    logger.error(`Error adding user: ${error.message}`);
    res.status(500).json({ message: "Error adding user" });
}

}

const fetchStockInfo=async (req,res)=>{
  try{
    const symbol=req.body["symbol"];
    const stockdetail=await stockdetail.findOne({symbol:symbol})
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

const fetchStockList=async (req,res)=>{
  try{
      const stocklist=await stockDetail.find().select("name symbol icon");
      res.json(stocklist);
    }
    catch(error)
    {
      logger.error(`Error fetching stock list: ${error.message}`);
      res.status(500).json({ message: "Error fetching stock list" });
    }
}


const getUsers = async (req, res) => {
    try {
        logger.info("Fetching all users...");
        const users = await users.find();
        logger.info(`Fetched ${users.length} users.`);
        res.json(users);
    } catch (error) {
        logger.error(`Error fetching users: ${error.message}`);
        res.status(500).json({ message: "Error fetching users" });
    }
};

const getGroqResponse=async (req, res) => {
    try {
      const { messages, model, temperature, max_tokens, top_p, stream, stop } = req.body;
  
      const temp={
                    "messages": [
                    {
                        "role": "user",
                        "content": "html kya hai\n"
                    },
                    {
                        "role": "assistant",
                        "content": "HTML (Hypertext Markup Language) is a standard markup language used to create web pages..."
                    }
                    ],
                    "model": "llama3-8b-8192",
                    "temperature": 1,
                    "max_tokens": 1024,
                    "top_p": 1,
                    "stream": true,
                    "stop": null
                }
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model,
        temperature,
        max_tokens,
        top_p,
        stream,
        stop
      });
  
      res.setHeader('Content-Type', 'text/plain');
      for await (const chunk of chatCompletion) {
        res.write(chunk.choices[0]?.delta?.content || '');
      }
      res.end();
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

module.exports = { getUsers,getGroqResponse,addUser,fetchStockList,fetchStockInfo,login };