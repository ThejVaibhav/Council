"""Thin wrapper over the model API: system prompt + user message in, validated Pydantic object out.

Groq (default) is called through its OpenAI-compatible endpoint with a JSON schema response format;
Gemini uses response_schema. Either way the result is validated again with Pydantic so a malformed
field fails here, not in the UI.
"""
import asyncio
import json
import logging
from typing import TypeVar

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)

log = logging.getLogger("council.llm")

MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 2.0
RETRYABLE_CODES = {429, 500, 502, 503, 504}

_client: genai.Client | None = None


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMError(RuntimeError):
    pass


class _HTTPError(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def get_client() -> genai.Client:
    global _client
    if _client is None:
        key = get_settings().gemini_api_key
        if not key:
            raise LLMError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=key)
    return _client


async def generate_structured(
    *,
    model: str,
    system_prompt: str,
    user_message: str,
    schema: type[T],
    timeout: float | None = None,
    client: genai.Client | None = None,
) -> T:
    """Retries rate limits (429), server errors (5xx) and malformed output with backoff,
    all within one overall deadline so a slow agent can never stall the debate."""
    settings = get_settings()
    if client is None and settings.llm_provider == "groq":
        fallback = bool(settings.gemini_api_key)
        try:
            return await _with_retries(
                model, timeout, lambda: _groq_call(model, system_prompt, user_message, schema), "Groq free tier",
                # With a fallback ready, a rate limit goes straight to Gemini instead of waiting it out.
                retry_codes=RETRYABLE_CODES - {429} if fallback else RETRYABLE_CODES,
            )
        except LLMError as e:
            if not fallback:
                raise
            gemini_model = settings.gemini_moderator_model if model == settings.moderator_model else settings.gemini_specialist_model
            log.warning("Groq failed (%s), falling back to Gemini %s", e, gemini_model)
            return await generate_structured(
                model=gemini_model, system_prompt=system_prompt, user_message=user_message, schema=schema,
                timeout=timeout, client=get_client(),
            )
    client = client or get_client()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        response_mime_type="application/json",
        response_schema=schema,
    )
    budget = timeout or get_settings().agent_timeout_seconds
    loop = asyncio.get_running_loop()
    deadline = loop.time() + budget
    last_error: Exception | None = None

    for attempt in range(MAX_ATTEMPTS):
        remaining = deadline - loop.time()
        if remaining <= 0:
            break
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(model=model, contents=user_message, config=config),
                timeout=remaining,
            )
            return _parse(response, schema, model)
        except asyncio.TimeoutError:
            raise LLMError(f"{model} timed out after {budget:.0f}s") from None
        except genai_errors.APIError as e:
            if e.code not in RETRYABLE_CODES:
                raise LLMError(f"{model} error {e.code}: {e.message or e.status}") from e
            last_error = e
        except LLMError as e:  # malformed or empty output, worth one more try
            last_error = e
        backoff = BACKOFF_SECONDS * (2**attempt)
        if loop.time() + backoff >= deadline:
            break
        await asyncio.sleep(backoff)

    if isinstance(last_error, genai_errors.APIError) and last_error.code == 429:
        raise LLMError(f"{model} is rate limited (Gemini free tier quota), try again in a minute") from last_error
    raise LLMError(f"{model} failed after retries: {last_error}") from last_error


def _parse(response, schema: type[T], model: str) -> T:
    if isinstance(response.parsed, schema):
        return response.parsed
    if not response.text:
        raise LLMError(f"{model} returned an empty response")
    try:
        return schema.model_validate_json(response.text)
    except ValueError as e:
        raise LLMError(f"{model} returned output that does not match {schema.__name__}: {e}") from e


async def _groq_call(model: str, system_prompt: str, user_message: str, schema: type[T]) -> T:
    key = get_settings().groq_api_key
    if not key:
        raise LLMError("GROQ_API_KEY is not set")
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": f"{system_prompt}\n\nReply with one JSON object matching this schema:\n{json.dumps(schema.model_json_schema())}"},
            {"role": "user", "content": user_message},
        ],
        "response_format": {"type": "json_schema", "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()}},
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=None) as http:
        r = await http.post(GROQ_URL, json=body, headers={"Authorization": f"Bearer {key}"})
    if r.status_code != 200:
        try:
            msg = r.json()["error"]["message"]
        except Exception:
            msg = r.text[:200]
        raise _HTTPError(r.status_code, msg)
    text = (r.json().get("choices") or [{}])[0].get("message", {}).get("content")
    if not text:
        raise LLMError(f"{model} returned an empty response")
    try:
        return schema.model_validate_json(text)
    except ValueError as e:
        raise LLMError(f"{model} returned output that does not match {schema.__name__}: {e}") from e


async def _with_retries(model: str, timeout: float | None, attempt_fn, quota_name: str, retry_codes=RETRYABLE_CODES):
    budget = timeout or get_settings().agent_timeout_seconds
    loop = asyncio.get_running_loop()
    deadline = loop.time() + budget
    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        remaining = deadline - loop.time()
        if remaining <= 0:
            break
        try:
            return await asyncio.wait_for(attempt_fn(), timeout=remaining)
        except asyncio.TimeoutError:
            raise LLMError(f"{model} timed out after {budget:.0f}s") from None
        except httpx.HTTPError as e:
            last_error = e
        except _HTTPError as e:
            if e.code == 429 and e.code not in retry_codes:
                raise LLMError(f"{model} is rate limited ({quota_name} quota)") from e
            if e.code not in retry_codes:
                raise LLMError(f"{model} error {e.code}: {e.message}") from e
            last_error = e
        except LLMError as e:
            if "is not set" in str(e):
                raise
            last_error = e
        backoff = BACKOFF_SECONDS * (2**attempt)
        if loop.time() + backoff >= deadline:
            break
        await asyncio.sleep(backoff)
    if isinstance(last_error, _HTTPError) and last_error.code == 429:
        raise LLMError(f"{model} is rate limited ({quota_name} quota), try again in a minute") from last_error
    raise LLMError(f"{model} failed after retries: {last_error}") from last_error
