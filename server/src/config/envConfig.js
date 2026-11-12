import dotenv from "dotenv";

dotenv.config();

export const envConfig = {
  port: process.env.PORT,
  db: process.env.MONGO_URI,
  finnhub: process.env.FINNHUB,
  jwt_secret_key: process.env.JWT_SECRET,
  ragServiceUrl: process.env.RAG_SERVICE_URL || "http://localhost:8001",
  redisUrl: process.env.REDIS_URL,
  newsCronEnabled: process.env.NEWS_CRON_ENABLED === "true",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
