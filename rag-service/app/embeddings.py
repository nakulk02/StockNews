"""Embedding providers behind one interface: embed(texts) -> vectors.

- local:   all-MiniLM-L6-v2 (ONNX, runs on CPU via Chroma; model downloads on first use)
- openai:  OpenAI embeddings API (default text-embedding-3-small), needs OPENAI_API_KEY
- bedrock: Amazon Bedrock Titan text embeddings (default amazon.titan-embed-text-v2:0)
- hash:    deterministic bag-of-words hashing, for tests only (no download, no network)
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from typing import Protocol

from .config import Settings


class Embedder(Protocol):
    name: str

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class LocalEmbedder:
    def __init__(self) -> None:
        from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

        self._fn = ONNXMiniLM_L6_V2()
        self.name = "local:all-MiniLM-L6-v2"

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [list(map(float, v)) for v in self._fn(texts)]


class OpenAIEmbedder:
    def __init__(self, model: str | None) -> None:
        from openai import OpenAI

        self._client = OpenAI()
        self._model = model or "text-embedding-3-small"
        self.name = f"openai:{self._model}"

    def embed(self, texts: list[str]) -> list[list[float]]:
        resp = self._client.embeddings.create(model=self._model, input=texts)
        return [d.embedding for d in resp.data]


class BedrockEmbedder:
    def __init__(self, model: str | None, region: str) -> None:
        import boto3

        self._client = boto3.client("bedrock-runtime", region_name=region)
        self._model = model or "amazon.titan-embed-text-v2:0"
        self.name = f"bedrock:{self._model}"

    def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for t in texts:
            resp = self._client.invoke_model(modelId=self._model, body=json.dumps({"inputText": t}))
            out.append(json.loads(resp["body"].read())["embedding"])
        return out


class HashEmbedder:
    """Test-only: hashed bag of words, L2-normalised. Similar wording -> similar vectors."""

    def __init__(self, dims: int = 256) -> None:
        self.dims = dims
        self.name = "hash"

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for text in texts:
            v = [0.0] * self.dims
            for word in re.findall(r"[a-z0-9]+", text.lower()):
                h = int(hashlib.md5(word.encode()).hexdigest(), 16)
                v[h % self.dims] += 1.0
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            vectors.append([x / norm for x in v])
        return vectors


def make_embedder(settings: Settings) -> Embedder:
    provider = settings.embedding_provider.lower()
    if provider == "local":
        return LocalEmbedder()
    if provider == "openai":
        return OpenAIEmbedder(settings.embedding_model)
    if provider == "bedrock":
        return BedrockEmbedder(settings.embedding_model, settings.aws_region)
    if provider == "hash":
        return HashEmbedder()
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {settings.embedding_provider}")
