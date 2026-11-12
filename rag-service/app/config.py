"""Settings, read once from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


@dataclass(frozen=True)
class Settings:
    # Vector store: a Chroma server when CHROMA_HOST is set, else an on-disk store.
    chroma_host: str | None = field(default_factory=lambda: _env("CHROMA_HOST"))
    chroma_port: int = field(default_factory=lambda: int(_env("CHROMA_PORT", "8000")))
    chroma_path: str = field(default_factory=lambda: _env("CHROMA_PATH", "./data/chroma"))
    collection: str = field(default_factory=lambda: _env("CHROMA_COLLECTION", "stock_news"))

    # Providers
    embedding_provider: str = field(default_factory=lambda: _env("EMBEDDING_PROVIDER", "local"))
    embedding_model: str | None = field(default_factory=lambda: _env("EMBEDDING_MODEL"))
    llm_provider: str = field(default_factory=lambda: _env("LLM_PROVIDER", "anthropic"))
    llm_model: str | None = field(default_factory=lambda: _env("LLM_MODEL"))
    llm_effort: str = field(default_factory=lambda: _env("LLM_EFFORT", "low"))
    llm_fallback_model: str = field(default_factory=lambda: _env("LLM_FALLBACK_MODEL", "claude-opus-4-8"))
    aws_region: str = field(default_factory=lambda: _env("AWS_REGION", "us-east-1"))

    # Chunking and retrieval
    chunk_tokens: int = field(default_factory=lambda: int(_env("CHUNK_TOKENS", "500")))
    chunk_overlap: int = field(default_factory=lambda: int(_env("CHUNK_OVERLAP", "75")))
    default_top_k: int = field(default_factory=lambda: int(_env("TOP_K", "5")))

    # Cache: disabled when REDIS_URL is unset.
    redis_url: str | None = field(default_factory=lambda: _env("REDIS_URL"))
    query_cache_ttl: int = field(default_factory=lambda: int(_env("QUERY_CACHE_TTL", "600")))


def get_settings() -> Settings:
    return Settings()
