import axios from "axios";
import { envConfig } from "../config/envConfig.js";
import loggerInit from "../utils/logger.js";

const logger = loggerInit();

const rag = axios.create({
  baseURL: envConfig.ragServiceUrl,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Send scraped articles to the RAG service for chunking, embedding and storage.
 * Failures are logged, not thrown: a RAG outage must not stop the news job.
 */
export async function ingestArticles(articles) {
  if (!articles.length) return null;
  try {
    const { data } = await rag.post("/ingest", { articles });
    logger.info(`RAG ingest: ${data.articles} articles, ${data.chunks} chunks in ${data.latency_ms} ms`);
    return data;
  } catch (err) {
    logger.error(`RAG ingest failed: ${err.message}`);
    return null;
  }
}

/** Ask a question about one stock. Returns the RAG service's answer with citations. */
export async function askRag({ symbol, question, days, topK }) {
  const { data } = await rag.post("/query", {
    symbol,
    question,
    ...(days ? { days } : {}),
    ...(topK ? { top_k: topK } : {}),
  });
  return data;
}
