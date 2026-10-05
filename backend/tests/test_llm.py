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
