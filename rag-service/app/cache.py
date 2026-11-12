"""Redis cache for /query responses.

Keys include a per-symbol version number that /ingest increments, so new
articles invalidate cached answers for that symbol without scanning keys.
Without REDIS_URL, or if Redis is unreachable, the cache becomes a no-op.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

log = logging.getLogger("rag.cache")


class QueryCache:
    def __init__(self, client: Any | None, ttl: int = 600) -> None:
        self._r = client
        self.ttl = ttl

    @classmethod
    def from_url(cls, url: str | None, ttl: int) -> "QueryCache":
        if not url:
            return cls(None, ttl)
        import redis

        return cls(redis.Redis.from_url(url, socket_timeout=0.5, socket_connect_timeout=0.5), ttl)

    @property
    def enabled(self) -> bool:
        return self._r is not None

    def _version(self, symbol: str) -> int:
        try:
            return int(self._r.get(f"rag:ver:{symbol}") or 0)
        except Exception as e:  # noqa: BLE001 - cache must never break a request
            log.warning("redis get failed: %s", e)
            return -1

    def key(self, symbol: str, payload: dict) -> str | None:
        if not self._r:
            return None
        ver = self._version(symbol)
        if ver < 0:
            return None
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:32]
        return f"rag:q:{symbol}:{ver}:{digest}"

    def get(self, key: str | None) -> dict | None:
        if not key:
            return None
        try:
            raw = self._r.get(key)
            return json.loads(raw) if raw else None
        except Exception as e:  # noqa: BLE001
            log.warning("redis get failed: %s", e)
            return None

    def set(self, key: str | None, value: dict) -> None:
        if not key:
            return
        try:
            self._r.set(key, json.dumps(value), ex=self.ttl)
        except Exception as e:  # noqa: BLE001
            log.warning("redis set failed: %s", e)

    def invalidate_symbol(self, symbol: str) -> None:
        if not self._r:
            return
        try:
            self._r.incr(f"rag:ver:{symbol}")
        except Exception as e:  # noqa: BLE001
            log.warning("redis incr failed: %s", e)
