"""Answer generation behind one interface: generate(system, prompt) -> text.

- anthropic: Claude via the Anthropic SDK (default claude-opus-5-5), needs ANTHROPIC_API_KEY
- openai:    OpenAI chat completions (default gpt-4o-mini), needs OPENAI_API_KEY
- bedrock:   Claude on Amazon Bedrock via the Converse API, uses AWS credentials
- extractive: no LLM. Returns the top retrieved sentences with citations. Used for
              tests, offline demos and the latency benchmark baseline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol

from .config import Settings


@dataclass
class Generation:
    text: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    meta: dict = field(default_factory=dict)


class LLM(Protocol):
    name: str

    def generate(self, system: str, prompt: str, sources: list[dict]) -> Generation: ...


class AnthropicLLM:
    def __init__(self, model: str | None, effort: str, fallback_model: str) -> None:
        import anthropic

        self._client = anthropic.Anthropic()
        self._model = model or "claude-opus-5-5"
        self._effort = effort
        self._fallback = None if fallback_model == "none" else fallback_model
        self.name = f"anthropic:{self._model}"

    def generate(self, system: str, prompt: str, sources: list[dict]) -> Generation:
        kwargs: dict = dict(
            model=self._model,
            max_tokens=4000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_config={"effort": self._effort},
        )
        if self._fallback:
            # If the main model declines a legitimate request, the API retries on the fallback model.
            resp = self._client.beta.messages.create(
                betas=["server-side-fallback-2026-06-01"], fallbacks=[{"model": self._fallback}], **kwargs
            )
        else:
            resp = self._client.messages.create(**kwargs)

        if resp.stop_reason == "refusal":
            text = "The model declined to answer this question."
        else:
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return Generation(
            text=text,
            model=resp.model,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
            meta={"stop_reason": resp.stop_reason},
        )


class OpenAILLM:
    def __init__(self, model: str | None) -> None:
        from openai import OpenAI

        self._client = OpenAI()
        self._model = model or "gpt-4o-mini"
        self.name = f"openai:{self._model}"

    def generate(self, system: str, prompt: str, sources: list[dict]) -> Generation:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        )
        u = resp.usage
        return Generation(
            text=resp.choices[0].message.content or "",
            model=self._model,
            input_tokens=getattr(u, "prompt_tokens", 0),
            output_tokens=getattr(u, "completion_tokens", 0),
        )


class BedrockLLM:
    def __init__(self, model: str | None, region: str) -> None:
        import boto3

        self._client = boto3.client("bedrock-runtime", region_name=region)
        self._model = model or "anthropic.claude-opus-5-5"
        self.name = f"bedrock:{self._model}"

    def generate(self, system: str, prompt: str, sources: list[dict]) -> Generation:
        resp = self._client.converse(
            modelId=self._model,
            system=[{"text": system}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4000},
        )
        text = "".join(c.get("text", "") for c in resp["output"]["message"]["content"])
        usage = resp.get("usage", {})
        return Generation(
            text=text,
            model=self._model,
            input_tokens=usage.get("inputTokens", 0),
            output_tokens=usage.get("outputTokens", 0),
        )


class ExtractiveLLM:
    """No model: picks the sentences from the top sources that best overlap the question."""

    name = "extractive"

    def generate(self, system: str, prompt: str, sources: list[dict]) -> Generation:
        question = prompt.rsplit("Question:", 1)[-1].lower()
        q_words = set(re.findall(r"[a-z]{4,}", question))
        picked: list[str] = []
        for s in sources[:3]:
            sentences = re.split(r"(?<=[.!?])\s+", s["text"])
            best = max(sentences, key=lambda x: len(q_words & set(re.findall(r"[a-z]{4,}", x.lower()))))
            picked.append(f"{best.strip()} [{s['n']}]")
        return Generation(text=" ".join(picked), model="extractive")


def make_llm(settings: Settings) -> LLM:
    provider = settings.llm_provider.lower()
    if provider == "anthropic":
        return AnthropicLLM(settings.llm_model, settings.llm_effort, settings.llm_fallback_model)
    if provider == "openai":
        return OpenAILLM(settings.llm_model)
    if provider == "bedrock":
        return BedrockLLM(settings.llm_model, settings.aws_region)
    if provider == "extractive":
        return ExtractiveLLM()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")
