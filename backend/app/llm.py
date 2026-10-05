"""Thin wrapper over the Gemini API: system prompt + user message in, validated Pydantic object out.

Structured output is enforced by Gemini (response_schema), and the result is
validated again with Pydantic so a malformed field fails here, not in the UI.
"""
import asyncio
from typing import TypeVar

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)

MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 2.0
RETRYABLE_CODES = {429, 500, 502, 503, 504}

_client: genai.Client | None = None


class LLMError(RuntimeError):
    pass


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
