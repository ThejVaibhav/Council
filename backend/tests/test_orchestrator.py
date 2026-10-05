"""End-to-end debate run with stubbed model calls against the real Postgres in DATABASE_URL."""
import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app import agents
from app.main import app
from app.schemas import FinalPlan, ModeratorSynthesis, SpecialistTurn, TradeOff

BRIEF = "Weekend trip for three, eight thousand rupees, near Bengaluru, relaxing."


def turn(agent, stance="propose"):
    return SpecialistTurn(
        option_title=f"{agent} pick", description="desc", estimated_cost=5000, stance=stance, commentary=f"{agent} says"
    )


@pytest.fixture
def stub_models(monkeypatch):
    calls = []

    async def specialist(agent, message):
        calls.append((agent, message))
        await asyncio.sleep(0.01)
        if agent == "logistics" and "Round two" in message:
            raise RuntimeError("timed out")
        return turn(agent, "flag" if "Round two" in message else "propose")

    async def moderator(message):
        calls.append(("moderator", message))
        return ModeratorSynthesis(
            final_plan=FinalPlan(title="Coorg homestay", description="Go.", estimated_cost=7500),
            trade_off_log=[TradeOff(agents_involved=["budget", "vibe"], disagreement="cost", which_concern_won="vibe")],
            summary="Do the homestay.",
        )

    monkeypatch.setattr(agents, "run_specialist", specialist)
    monkeypatch.setattr(agents, "run_moderator", moderator)
    return calls


def parse_sse(text):
    events = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def test_stream_runs_full_debate_and_persists(stub_models):
    with TestClient(app) as client:
        r = client.post("/sessions/stream", json={"brief": BRIEF, "constraints": {"budget": 8000, "headcount": 3}})
        assert r.status_code == 200
        events = parse_sse(r.text)
        kinds = [k for k, _ in events]
        assert kinds[0] == "session" and kinds[-1] == "done"
        assert kinds.count("turn") == 5  # 3 in round one, 2 in round two (logistics failed)
        assert ("agent_error", "logistics") in [(k, e.get("agent")) for k, e in events]
        assert kinds.index("final_plan") > max(i for i, k in enumerate(kinds) if k == "turn")

        # round two saw round one; moderator saw the failure gap; constraints reached the agents
        r2_msgs = [m for a, m in stub_models if a != "moderator" and "Round two" in m]
        assert all("budget pick" in m and "vibe pick" in m for m in r2_msgs)
        assert "budget: 8000" in stub_models[0][1]
        assert "failed or timed out" in [m for a, m in stub_models if a == "moderator"][0]

        session_id = events[0][1]["session_id"]
        saved = client.get(f"/sessions/{session_id}").json()
        assert saved["session"]["status"] == "complete"
        assert len(saved["turns"]) == 6  # 5 specialist + moderator
        assert saved["final_plan"]["trade_off_log"][0]["which_concern_won"] == "vibe"


def test_all_round_one_failures_mark_session_failed(monkeypatch):
    async def boom(agent, message):
        raise RuntimeError("no key")

    monkeypatch.setattr(agents, "run_specialist", boom)
    with TestClient(app) as client:
        events = parse_sse(client.post("/sessions/stream", json={"brief": BRIEF}).text)
        assert events[-1][0] == "error"
        saved = client.get(f"/sessions/{events[0][1]['session_id']}").json()
        assert saved["session"]["status"] == "failed"


def test_non_streaming_endpoint(stub_models):
    with TestClient(app) as client:
        body = client.post("/sessions", json={"brief": BRIEF}).json()
        assert body["events"][-1]["type"] == "done"
