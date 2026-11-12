/**
 * One-off news update: node scripts/update-news.js [SYMBOL ...]
 * Fetches the last 5 days of Finnhub news for the given symbols (default: all
 * tracked symbols), summarises it and indexes it in the RAG service.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { getNews } from "../src/services/userServices.js";
import { symbolToName } from "../src/utils/utils.js";

const fmt = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000);
const symbols = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(symbolToName);

await connectDB();
for (const symbol of symbols) {
  try {
    const result = await getNews(symbol.toUpperCase(), fmt(start), fmt(end));
    console.log(`${symbol}: ${result.articles} articles indexed`);
  } catch (err) {
    console.error(`${symbol}: failed - ${err.message}`);
  }
}
await mongoose.disconnect();
process.exit(0);
