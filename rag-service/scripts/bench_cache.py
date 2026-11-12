"""Measure /query latency with and without the Redis query cache.

Against a running service (real Redis, e.g. docker compose):
    python -m scripts.bench_cache --url http://localhost:8001 --runs 20

In-process with fakeredis (no services needed; measures the pipeline and the
cache logic, not Redis network latency):
    python -m scripts.bench_cache --runs 20

Each question is asked `runs` times. The first call per question is a cache
miss (the full pipeline: embed, retrieve, generate). Later calls are hits.
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

QUESTIONS = [
    ("AAPL", "What's the latest news risk for AAPL?"),
    ("TSLA", "Is there a safety recall affecting Tesla cars?"),
    ("MSFT", "Is Microsoft under any antitrust investigation?"),
]


def pct(xs: list[float], p: float) -> float:
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))]


def run_http(url: str, runs: int):
    import httpx

    articles = json.loads((Path(__file__).parents[1] / "eval" / "articles.json").read_text())["articles"]
    httpx.post(f"{url}/ingest", json={"articles": articles}, timeout=120).raise_for_status()
    miss, hit = [], []
    for symbol, q in QUESTIONS:
        for i in range(runs):
            t = time.perf_counter()
            r = httpx.post(f"{url}/query", json={"question": q, "symbol": symbol}, timeout=120).json()
            ms = (time.perf_counter() - t) * 1000
            (hit if r["cached"] else miss).append(ms)
    return miss, hit


def run_inprocess(runs: int):
    import fakeredis

    from app.cache import QueryCache
    from app.config import get_settings
    from app.embeddings import make_embedder
    from app.llm import make_llm
    from app.rag import RAGPipeline
    from app.schemas import ArticleIn, QueryRequest
    from app.store import VectorStore

    settings = get_settings()
    emb = make_embedder(settings)
    p = RAGPipeline(
        settings=settings,
        embedder=emb,
        store=VectorStore.in_memory(emb.name, collection=f"bench{int(time.time())}"),
        llm=make_llm(settings),
        cache=QueryCache(fakeredis.FakeRedis(), ttl=600),
    )
    articles = json.loads((Path(__file__).parents[1] / "eval" / "articles.json").read_text())["articles"]
    p.ingest([ArticleIn(**a) for a in articles])
    miss, hit = [], []
    for symbol, q in QUESTIONS:
        for _ in range(runs):
            t = time.perf_counter()
            r = p.query(QueryRequest(question=q, symbol=symbol))
            ms = (time.perf_counter() - t) * 1000
            (hit if r.cached else miss).append(ms)
    return miss, hit


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--runs", type=int, default=20)
    args = ap.parse_args()

    miss, hit = run_http(args.url, args.runs) if args.url else run_inprocess(args.runs)
    m, h = statistics.median(miss), statistics.median(hit)
    print(f"cache miss: n={len(miss)}  p50={m:.1f} ms  p95={pct(miss, 0.95):.1f} ms")
    print(f"cache hit:  n={len(hit)}  p50={h:.2f} ms  p95={pct(hit, 0.95):.2f} ms")
    print(f"p50 latency reduction on repeat queries: {(1 - h / m) * 100:.1f}%")


if __name__ == "__main__":
    main()
