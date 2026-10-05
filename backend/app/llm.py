"""Thin wrapper over the Gemini API: system prompt + user message in, validated Pydantic object out.

Structured output is enforced by Gemini (response_schema), and the result is
validated again with Pydantic so a malformed field fails here, not in the UI.
"""
import asyncio
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)

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
    client = client or get_client()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        response_mime_type="application/json",
        response_schema=schema,
    )
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(model=model, contents=user_message, config=config),
            timeout=timeout or get_settings().agent_timeout_seconds,
        )
    except asyncio.TimeoutError as e:
        raise LLMError(f"{model} timed out") from e

    if isinstance(response.parsed, schema):
        return response.parsed
    if not response.text:
        raise LLMError(f"{model} returned an empty response")
    try:
        return schema.model_validate_json(response.text)
    except ValueError as e:
        raise LLMError(f"{model} returned output that does not match {schema.__name__}: {e}") from e
