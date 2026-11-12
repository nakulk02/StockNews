"""Load the synthetic eval articles into a running service, for demos without a Finnhub key.

    docker compose exec rag-service python -m scripts.seed_demo
"""
import json
import os
from pathlib import Path

import httpx

url = os.environ.get("RAG_URL", "http://localhost:8001")
articles = json.loads((Path(__file__).parents[1] / "eval" / "articles.json").read_text())["articles"]
resp = httpx.post(f"{url}/ingest", json={"articles": articles}, timeout=300)
resp.raise_for_status()
print(resp.json())
