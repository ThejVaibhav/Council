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


class FakeHTTP:
    def __init__(self, responses):
        self.responses = list(responses)
        self.bodies = []

    async def post(self, url, json=None, headers=None):
        import httpx

        self.bodies.append(json)
        status, payload = self.responses.pop(0)
        return httpx.Response(status, json=payload, request=httpx.Request("POST", url))


def groq(monkeypatch, responses, gemini_key=""):
    import httpx

    from app import llm

    fake = FakeHTTP(responses)

    class Client:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return fake

        async def __aexit__(self, *a):
            return False

    monkeypatch.setattr(httpx, "AsyncClient", Client)
    monkeypatch.setattr(llm, "BACKOFF_SECONDS", 0.01)
    monkeypatch.setattr(llm, "get_settings", lambda: type("S", (), {
        "llm_provider": "groq", "groq_api_key": "k", "gemini_api_key": gemini_key, "agent_timeout_seconds": 5,
        "specialist_model": "g-small", "moderator_model": "g-big",
        "gemini_specialist_model": "gem-flash", "gemini_moderator_model": "gem-pro",
    })())
    return fake


def ok(obj):
    return 200, {"choices": [{"message": {"content": json.dumps(obj)}}]}


def test_groq_returns_validated_object_and_sends_schema(monkeypatch):
    fake = groq(monkeypatch, [ok(VALID)])
    out = run(generate_structured(model="openai/gpt-oss-20b", system_prompt="sys", user_message="msg", schema=SpecialistTurn))
    assert out.option_title == "Homestay in Coorg"
    assert fake.bodies[0]["response_format"]["type"] == "json_schema"


def test_groq_retries_rate_limit(monkeypatch):
    groq(monkeypatch, [(429, {"error": {"message": "slow down"}}), ok(VALID)])
    out = run(generate_structured(model="m", system_prompt="s", user_message="u", schema=SpecialistTurn))
    assert out.stance == "propose"


def test_groq_client_error_not_retried(monkeypatch):
    groq(monkeypatch, [(400, {"error": {"message": "bad model"}})])
    with pytest.raises(LLMError, match="bad model"):
        run(generate_structured(model="m", system_prompt="s", user_message="u", schema=SpecialistTurn))


def with_gemini(monkeypatch, response):
    from app import llm

    gem = FakeClient(response)
    monkeypatch.setattr(llm, "get_client", lambda: gem)
    return gem


def test_groq_rate_limit_falls_back_to_gemini_immediately(monkeypatch):
    fake = groq(monkeypatch, [(429, {"error": {"message": "slow down"}})], gemini_key="g")
    gem = with_gemini(monkeypatch, FakeResponse(json.dumps(VALID)))
    out = run(generate_structured(model="g-big", system_prompt="s", user_message="u", schema=SpecialistTurn))
    assert out.option_title == "Homestay in Coorg"
    assert len(fake.bodies) == 1 and gem.calls[0][0] == "gem-pro"


def test_groq_error_falls_back_with_specialist_model(monkeypatch):
    groq(monkeypatch, [(400, {"error": {"message": "bad"}})], gemini_key="g")
    gem = with_gemini(monkeypatch, FakeResponse(json.dumps(VALID)))
    run(generate_structured(model="g-small", system_prompt="s", user_message="u", schema=SpecialistTurn))
    assert gem.calls[0][0] == "gem-flash"


def test_no_fallback_without_gemini_key(monkeypatch):
    groq(monkeypatch, [(429, {"error": {"message": "x"}})] * 3)
    with pytest.raises(LLMError, match="rate limited"):
        run(generate_structured(model="m", system_prompt="s", user_message="u", schema=SpecialistTurn))
