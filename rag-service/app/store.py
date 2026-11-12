"""Chroma vector store wrapper.

Embeddings are computed by our own Embedder and passed in explicitly, so the
store doesn't care which provider produced them. Each chunk is stored with
metadata used for filtering and citations: symbol, published date, source URL.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

_NO_TELEMETRY = ChromaSettings(anonymized_telemetry=False)

from .config import Settings


@dataclass
class RetrievedChunk:
    id: str
    text: str
    score: float  # cosine similarity, 1.0 = identical
    symbol: str
    title: str
    url: str
    source: str
    published_at: str


class VectorStore:
    def __init__(self, client: Any, collection: str, embedder_name: str) -> None:
        # One collection per embedding model: vectors from different models can't be mixed.
        safe = embedder_name.replace(":", "-").replace("/", "-").replace(".", "-")
        self._collection = client.get_or_create_collection(
            name=f"{collection}-{safe}"[:63], metadata={"hnsw:space": "cosine"}
        )

    @classmethod
    def from_settings(cls, settings: Settings, embedder_name: str) -> "VectorStore":
        if settings.chroma_host:
            client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port, settings=_NO_TELEMETRY)
        else:
            client = chromadb.PersistentClient(path=settings.chroma_path, settings=_NO_TELEMETRY)
        return cls(client, settings.collection, embedder_name)

    @classmethod
    def in_memory(cls, embedder_name: str, collection: str = "test") -> "VectorStore":
        return cls(chromadb.EphemeralClient(settings=_NO_TELEMETRY), collection, embedder_name)

    def upsert(self, ids: list[str], texts: list[str], vectors: list[list[float]], metadatas: list[dict]) -> None:
        if ids:
            self._collection.upsert(ids=ids, documents=texts, embeddings=vectors, metadatas=metadatas)

    def delete_article(self, article_id: str) -> None:
        self._collection.delete(where={"article_id": article_id})

    def count(self) -> int:
        return self._collection.count()

    def query(
        self,
        vector: list[float],
        k: int,
        symbol: str | None = None,
        since_ts: int | None = None,
    ) -> list[RetrievedChunk]:
        clauses: list[dict] = []
        if symbol:
            clauses.append({"symbol": symbol.upper()})
        if since_ts is not None:
            clauses.append({"published_ts": {"$gte": since_ts}})
        where = None if not clauses else clauses[0] if len(clauses) == 1 else {"$and": clauses}

        res = self._collection.query(
            query_embeddings=[vector],
            n_results=k,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        out: list[RetrievedChunk] = []
        for cid, doc, meta, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]):
            out.append(
                RetrievedChunk(
                    id=cid,
                    text=doc,
                    score=round(1.0 - float(dist), 4),
                    symbol=meta.get("symbol", ""),
                    title=meta.get("title", ""),
                    url=meta.get("url", ""),
                    source=meta.get("source", ""),
                    published_at=meta.get("published_at", ""),
                )
            )
        return out
