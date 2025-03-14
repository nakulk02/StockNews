import dotenv from "dotenv";

dotenv.config();

export const envConfig={
    port: process.env.PORT,
    db: process.env.MONGO_URI,
    finnhub:process.env.FINNHUB,
    // groq:process.env.GROQ_API_KEY,
    jwt_secret_key:process.env.JWT_SECRET
}