"""FastAPI entry point: uvicorn app.main:app --port 8001"""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import Depends, FastAPI

from .cache import QueryCache
from .config import get_settings
from .embeddings import make_embedder
from .llm import make_llm
from .rag import RAGPipeline
from .schemas import IngestRequest, IngestResponse, QueryRequest, QueryResponse
from .store import VectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("rag")

app = FastAPI(title="StockNews RAG service", version="1.0.0")


@lru_cache(maxsize=1)
def get_pipeline() -> RAGPipeline:
    settings = get_settings()
    embedder = make_embedder(settings)
    return RAGPipeline(
        settings=settings,
        embedder=embedder,
        store=VectorStore.from_settings(settings, embedder.name),
        llm=make_llm(settings),
        cache=QueryCache.from_url(settings.redis_url, settings.query_cache_ttl),
    )


@app.get("/health")
def health(p: RAGPipeline = Depends(get_pipeline)) -> dict:
    return {
        "status": "ok",
        "chunks": p.store.count(),
        "embedding_model": p.embedder.name,
        "llm": p.llm.name,
        "cache": p.cache.enabled,
    }


@app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest, p: RAGPipeline = Depends(get_pipeline)) -> IngestResponse:
    resp = p.ingest(req.articles)
    log.info("ingest articles=%d chunks=%d latency_ms=%.0f", resp.articles, resp.chunks, resp.latency_ms)
    return resp


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest, p: RAGPipeline = Depends(get_pipeline)) -> QueryResponse:
    resp = p.query(req)
    log.info(
        "query symbol=%s cached=%s retrieved=%d cited=%d latency_ms=%.0f",
        req.symbol, resp.cached, len(resp.retrieved), len(resp.citations), resp.latency_ms,
    )
    return resp
