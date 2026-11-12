from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl, field_validator


class ArticleIn(BaseModel):
    symbol: str = Field(min_length=1, max_length=10, examples=["AAPL"])
    title: str = Field(default="", max_length=500)
    url: HttpUrl
    source: str = Field(default="", max_length=200)
    published_at: datetime
    text: str = Field(min_length=1)

    @field_validator("symbol")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.strip().upper()


class IngestRequest(BaseModel):
    articles: list[ArticleIn] = Field(min_length=1, max_length=200)


class IngestResponse(BaseModel):
    articles: int
    chunks: int
    skipped: int
    embedding_model: str
    latency_ms: float


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    symbol: str = Field(min_length=1, max_length=10)
    top_k: int | None = Field(default=None, ge=1, le=20)
    days: int | None = Field(default=None, ge=1, le=3650, description="Only use articles from the last N days")

    @field_validator("symbol")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.strip().upper()


class Citation(BaseModel):
    n: int
    title: str
    url: str
    source: str
    published_at: str


class RetrievedOut(BaseModel):
    n: int
    chunk_id: str
    score: float
    title: str
    url: str
    published_at: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    retrieved: list[RetrievedOut]
    model: str
    embedding_model: str
    cached: bool = False
    latency_ms: float
    timings_ms: dict[str, float] = {}
    usage: dict[str, int] = {}
