import asyncio
import json

import pytest

from app.llm import LLMError, generate_structured
from app.schemas import SpecialistTurn

VALID = {
    "option_title": "Homestay in Coorg",
    "description": "Two nights in a shared homestay, self drive.",
    "estimated_cost": 7200,
    "stance": "propose",
    "commentary": "Fits with room to spare.",
}


class FakeResponse:
    def __init__(self, text, parsed=None):
        self.text = text
        self.parsed = parsed


class FakeClient:
    def __init__(self, response=None, delay=0.0):
        self.response = response
        self.delay = delay
        self.calls = []
        self.aio = self
        self.models = self

    async def generate_content(self, *, model, contents, config):
        self.calls.append((model, contents, config))
        await asyncio.sleep(self.delay)
        return self.response


def run(coro):
    return asyncio.run(coro)


def call(client, timeout=1.0):
    return generate_structured(
        model="m", system_prompt="sys", user_message="msg", schema=SpecialistTurn, timeout=timeout, client=client
    )


def test_returns_parsed_object_and_sends_schema():
    client = FakeClient(FakeResponse(json.dumps(VALID)))
    turn = run(call(client))
    assert turn.option_title == "Homestay in Coorg"
    model, contents, config = client.calls[0]
    assert config.system_instruction == "sys"
    assert config.response_mime_type == "application/json"
    assert config.response_schema is SpecialistTurn


def test_null_cost_is_allowed():
    client = FakeClient(FakeResponse(json.dumps({**VALID, "estimated_cost": None})))
    assert run(call(client)).estimated_cost is None


def test_bad_stance_raises():
    client = FakeClient(FakeResponse(json.dumps({**VALID, "stance": "maybe"})))
    with pytest.raises(LLMError):
        run(call(client))


def test_empty_response_raises():
    with pytest.raises(LLMError):
        run(call(FakeClient(FakeResponse(""))))


def test_timeout_raises():
    with pytest.raises(LLMError, match="timed out"):
        run(call(FakeClient(FakeResponse(json.dumps(VALID)), delay=0.5), timeout=0.05))


class FlakyClient(FakeClient):
    """Fails with the given errors first, then returns a valid response."""

    def __init__(self, failures):
        super().__init__(FakeResponse(json.dumps(VALID)))
        self.failures = list(failures)

    async def generate_content(self, *, model, contents, config):
        self.calls.append(model)
        if self.failures:
            f = self.failures.pop(0)
            if isinstance(f, Exception):
                raise f
            return f
        return self.response


@pytest.fixture(autouse=True)
def fast_backoff(monkeypatch):
    monkeypatch.setattr("app.llm.BACKOFF_SECONDS", 0.01)


def api_error(code):
    from google.genai import errors

    return errors.APIError(code, {"error": {"code": code, "message": "nope", "status": "X"}})


def test_retries_rate_limit_then_succeeds():
    client = FlakyClient([api_error(429), api_error(503)])
    assert run(call(client)).option_title == "Homestay in Coorg"
    assert len(client.calls) == 3


def test_retries_malformed_output_once():
    client = FlakyClient([FakeResponse("{not json")])
    assert run(call(client)).stance == "propose"


def test_persistent_rate_limit_gives_clear_error():
    client = FlakyClient([api_error(429)] * 5)
    with pytest.raises(LLMError, match="rate limited"):
        run(call(client))


def test_client_error_is_not_retried():
    client = FlakyClient([api_error(400)])
    with pytest.raises(LLMError, match="error 400"):
        run(call(client))
    assert len(client.calls) == 1
