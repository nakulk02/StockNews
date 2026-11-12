"""Retrieval and citation eval.

    python -m eval.run_eval            # top_k=3, providers from env
    python -m eval.run_eval --k 5

Ingests eval/articles.json into a fresh in-memory collection using the
configured EMBEDDING_PROVIDER, then for each question in eval/qa.json:

- hit@k: at least one expected article is among the top-k retrieved chunks
- MRR:   1 / rank of the first expected article (0 if not retrieved)
- cited: the answer cites at least one retrieved source, and every citation
         points to a retrieved source

Answers come from LLM_PROVIDER. Without ANTHROPIC_API_KEY (for the default
anthropic provider) the script falls back to the extractive provider, so
retrieval metrics are always measured. The citation numbers are then only a
plumbing check.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import replace
from pathlib import Path

from app.cache import QueryCache
from app.config import get_settings
from app.embeddings import make_embedder
from app.llm import ExtractiveLLM, make_llm
from app.rag import RAGPipeline
from app.schemas import ArticleIn, QueryRequest
from app.store import VectorStore

HERE = Path(__file__).parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=3)
    ap.add_argument("--out", default=str(HERE / "results" / "latest.json"))
    args = ap.parse_args()

    settings = get_settings()
    if settings.llm_provider == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set: using the extractive answer provider.\n")
        settings = replace(settings, llm_provider="extractive")

    embedder = make_embedder(settings)
    llm = ExtractiveLLM() if settings.llm_provider == "extractive" else make_llm(settings)
    pipeline = RAGPipeline(
        settings=settings,
        embedder=embedder,
        store=VectorStore.in_memory(embedder.name, collection=f"eval{int(time.time())}"),
        llm=llm,
        cache=QueryCache(None),
    )

    articles = json.loads((HERE / "articles.json").read_text())["articles"]
    qa = json.loads((HERE / "qa.json").read_text())
    ing = pipeline.ingest([ArticleIn(**a) for a in articles])
    print(f"Ingested {ing.articles} articles -> {ing.chunks} chunks with {embedder.name}\n")

    rows = []
    for item in qa:
        r = pipeline.query(QueryRequest(question=item["question"], symbol=item["symbol"], top_k=args.k))
        urls = [x.url for x in r.retrieved]
        expected = set(item["expected_urls"])
        rank = next((i + 1 for i, u in enumerate(urls) if u in expected), None)
        retrieved_urls = set(urls)
        cited_ok = bool(r.citations) and all(c.url in retrieved_urls for c in r.citations)
        rows.append(
            {
                "id": item["id"],
                "hit": rank is not None,
                "rank": rank,
                "cited": cited_ok,
                "latency_ms": r.latency_ms,
                "answer": r.answer,
                "retrieved": urls,
            }
        )
        print(f"{'HIT ' if rank else 'MISS'} {'CITED' if cited_ok else 'NOCITE'}  {item['id']:<20} rank={rank}  {r.latency_ms:7.1f} ms")

    n = len(rows)
    summary = {
        "embedding_model": embedder.name,
        "llm": llm.name,
        "k": args.k,
        "questions": n,
        "hit_rate": round(sum(r["hit"] for r in rows) / n, 3),
        "mrr": round(sum(1 / r["rank"] for r in rows if r["rank"]) / n, 3),
        "citation_rate": round(sum(r["cited"] for r in rows) / n, 3),
        "avg_latency_ms": round(sum(r["latency_ms"] for r in rows) / n, 1),
    }
    print(
        f"\nhit@{args.k}: {summary['hit_rate']:.0%}   MRR: {summary['mrr']:.2f}   "
        f"cited a retrieved source: {summary['citation_rate']:.0%}   avg latency: {summary['avg_latency_ms']} ms"
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "rows": rows}, indent=2))


if __name__ == "__main__":
    main()
