"""Token-window chunking with overlap.

Tokens are approximated with a regex that splits words, numbers and
punctuation. For English news text this is within about 10-20% of a BPE
tokenizer's count, close enough to size ~500-token chunks without pulling in
a tokenizer dependency. Chunks are cut on sentence boundaries where possible.
"""
from __future__ import annotations

import re

_TOKEN = re.compile(r"\w+|[^\w\s]", re.UNICODE)
_SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")


def count_tokens(text: str) -> int:
    return len(_TOKEN.findall(text))


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 75) -> list[str]:
    if overlap >= max_tokens:
        raise ValueError("overlap must be smaller than max_tokens")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    sentences = [s for s in _SENTENCE.split(text) if s]
    # Split any sentence that alone exceeds the window into word runs.
    pieces: list[str] = []
    for s in sentences:
        if count_tokens(s) <= max_tokens:
            pieces.append(s)
            continue
        words = s.split(" ")
        buf: list[str] = []
        for w in words:
            buf.append(w)
            if count_tokens(" ".join(buf)) >= max_tokens:
                pieces.append(" ".join(buf))
                buf = []
        if buf:
            pieces.append(" ".join(buf))

    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0
    for piece in pieces:
        t = count_tokens(piece)
        if current and current_tokens + t > max_tokens:
            chunks.append(" ".join(current))
            # Carry trailing sentences forward until the overlap budget is used.
            carried: list[str] = []
            carried_tokens = 0
            for prev in reversed(current):
                pt = count_tokens(prev)
                if carried_tokens + pt > overlap:
                    break
                carried.insert(0, prev)
                carried_tokens += pt
            current, current_tokens = carried, carried_tokens
        current.append(piece)
        current_tokens += t
    if current:
        chunks.append(" ".join(current))
    return chunks
