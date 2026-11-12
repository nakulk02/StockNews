import fakeredis
from fastapi.testclient import TestClient

from app import main
from app.cache import QueryCache
from app.chunking import chunk_text, count_tokens
from app.config import Settings
from app.embeddings import HashEmbedder
from app.llm import ExtractiveLLM, Generation
from app.rag import RAGPipeline
from app.store import VectorStore

ARTICLES = [
    {
        "symbol": "aapl",
        "title": "Apple faces EU antitrust fine over App Store rules",
        "url": "https://news.example.com/apple-eu-fine",
        "source": "Example Wire",
        "published_at": "2026-11-10T09:00:00Z",
        "text": "European regulators fined Apple over App Store anti-steering rules. "
        "Analysts said the antitrust fine adds regulatory risk for the services business.",
    },
    {
        "symbol": "AAPL",
        "title": "Apple iPhone sales beat expectations",
        "url": "https://news.example.com/apple-iphone-sales",
        "source": "Example Wire",
        "published_at": "2026-11-01T09:00:00Z",
        "text": "Apple reported iPhone revenue above analyst estimates, helped by strong demand in India.",
    },
    {
        "symbol": "TSLA",
        "title": "Tesla recalls vehicles over steering issue",
        "url": "https://news.example.com/tesla-recall",
        "source": "Example Wire",
        "published_at": "2026-11-09T09:00:00Z",
        "text": "Tesla is recalling vehicles because of a power steering fault, regulators said.",
    },
]


def make_pipeline(cache=None, llm=None) -> RAGPipeline:
    emb = HashEmbedder()
    return RAGPipeline(
        settings=Settings(),
        embedder=emb,
        store=VectorStore.in_memory(emb.name, collection=f"t{id(object())}"),
        llm=llm or ExtractiveLLM(),
        cache=cache or QueryCache(None),
    )


def client_for(pipeline: RAGPipeline) -> TestClient:
    main.app.dependency_overrides[main.get_pipeline] = lambda: pipeline
    return TestClient(main.app)


def test_chunking_respects_window_and_overlap():
    text = " ".join(f"Sentence number {i} talks about earnings and guidance." for i in range(300))
    chunks = chunk_text(text, max_tokens=500, overlap=75)
    assert len(chunks) > 1
    assert all(count_tokens(c) <= 500 for c in chunks)
    # Consecutive chunks share text.
    assert chunks[0].split(". ")[-1][:30] in chunks[1]


def test_ingest_and_query_filters_by_symbol_and_cites_sources():
    p = make_pipeline()
    c = client_for(p)
    r = c.post("/ingest", json={"articles": ARTICLES})
    assert r.status_code == 200
    assert r.json()["chunks"] == 3

    r = c.post("/query", json={"question": "What is the latest regulatory risk for Apple?", "symbol": "AAPL"})
    body = r.json()
    assert r.status_code == 200
    assert {x["url"] for x in body["retrieved"]} <= {a["url"] for a in ARTICLES[:2]}  # no TSLA chunks
    assert body["retrieved"][0]["url"] == "https://news.example.com/apple-eu-fine"
    assert body["citations"], "answer should cite at least one retrieved source"
    assert all(cit["url"] in {x["url"] for x in body["retrieved"]} for cit in body["citations"])


def test_reingesting_an_article_replaces_its_chunks():
    p = make_pipeline()
    c = client_for(p)
    c.post("/ingest", json={"articles": ARTICLES})
    c.post("/ingest", json={"articles": ARTICLES[:1]})
    assert p.store.count() == 3


def test_days_filter_excludes_old_articles():
    p = make_pipeline()
    c = client_for(p)
    old = dict(ARTICLES[0], url="https://news.example.com/old", published_at="2020-01-01T00:00:00Z")
    c.post("/ingest", json={"articles": [old]})
    body = c.post("/query", json={"question": "regulatory risk", "symbol": "AAPL", "days": 30}).json()
    assert body["retrieved"] == []
    assert body["citations"] == []


class CountingLLM:
    name = "counting"

    def __init__(self):
        self.calls = 0

    def generate(self, system, prompt, sources):
        self.calls += 1
        return Generation(text="Apple was fined in the EU [1].", model="counting")


def test_query_cache_hits_and_is_invalidated_by_ingest():
    llm = CountingLLM()
    p = make_pipeline(cache=QueryCache(fakeredis.FakeRedis(), ttl=60), llm=llm)
    c = client_for(p)
    c.post("/ingest", json={"articles": ARTICLES})
    q = {"question": "What is the latest regulatory risk for Apple?", "symbol": "AAPL"}

    first = c.post("/query", json=q).json()
    second = c.post("/query", json=q).json()
    assert first["cached"] is False and second["cached"] is True
    assert llm.calls == 1

    c.post("/ingest", json={"articles": ARTICLES[1:2]})  # new AAPL news invalidates the cache
    third = c.post("/query", json=q).json()
    assert third["cached"] is False
    assert llm.calls == 2


def test_cache_is_a_noop_when_redis_is_down():
    class Broken:
        def get(self, *a):
            raise ConnectionError("down")

        set = incr = get

    p = make_pipeline(cache=QueryCache(Broken()))
    c = client_for(p)
    c.post("/ingest", json={"articles": ARTICLES})
    r = c.post("/query", json={"question": "Apple fine", "symbol": "AAPL"})
    assert r.status_code == 200 and r.json()["cached"] is False


def test_validation_rejects_bad_input():
    c = client_for(make_pipeline())
    assert c.post("/query", json={"question": "", "symbol": "AAPL"}).status_code == 422
    assert c.post("/ingest", json={"articles": [{"symbol": "AAPL", "url": "not-a-url", "published_at": "2026-01-01", "text": "x"}]}).status_code == 422
