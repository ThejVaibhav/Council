"""Accounts, friends and shared plans, against the real Postgres with stubbed model calls."""
import asyncio
import json
import uuid

import pytest
from fastapi.testclient import TestClient

from app import agents
from app.main import app
from app.schemas import FinalPlan, ModeratorSynthesis, SpecialistTurn, TradeOff

BRIEF = "Beach weekend for four friends from Bengaluru, fourteen thousand total."


@pytest.fixture
def stub_models(monkeypatch):
    async def specialist(agent, message):
        await asyncio.sleep(0.02)
        return SpecialistTurn(option_title=f"{agent} pick", description="d", estimated_cost=1000, stance="propose", commentary=agent)

    async def moderator(message):
        return ModeratorSynthesis(
            final_plan=FinalPlan(title="Gokarna", description="Go.", estimated_cost=13000),
            trade_off_log=[TradeOff(agents_involved=["budget", "vibe"], disagreement="cost", which_concern_won="Budget, cap")],
            summary="Go to Gokarna.",
        )

    monkeypatch.setattr(agents, "run_specialist", specialist)
    monkeypatch.setattr(agents, "run_moderator", moderator)


def signup(client, name, email=None):
    username = f"{name}_{uuid.uuid4().hex[:6]}"
    r = client.post("/auth/signup", json={"username": username, "display_name": name.title(), "password": "correct-horse", "email": email})
    assert r.status_code == 200, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]


def events(client, plan_id, headers):
    r = client.get(f"/plans/{plan_id}/stream", headers=headers)
    assert r.status_code == 200
    out = []
    for block in r.text.strip().split("\n\n"):
        data = [line[6:] for line in block.splitlines() if line.startswith("data: ")]
        if data:
            out.append(json.loads(data[0]))
    return out


def test_signup_login_and_profile():
    with TestClient(app) as c:
        email = f"asha{uuid.uuid4().hex[:6]}@example.com"
        h, user = signup(c, "asha", email)
        assert c.get("/me", headers=h).json()["username"] == user["username"]
        # log in with email, case-insensitive
        r = c.post("/auth/login", json={"login": email.upper(), "password": "correct-horse"})
        assert r.status_code == 200
        assert c.post("/auth/login", json={"login": user["username"], "password": "wrong-pass"}).status_code == 401
        # duplicate username
        r = c.post("/auth/signup", json={"username": user["username"], "display_name": "X", "password": "correct-horse"})
        assert r.status_code == 409
        # avatar round trip, with a pet; unknown breed falls back
        avatar = {"body": "female", "skin": 4, "hair": "afro", "glasses": "round", "pet": {"kind": "dog", "breed": "Unicorn", "name": "Bruno"}}
        me = c.put("/me", headers=h, json={"avatar": avatar}).json()
        assert me["avatar"]["hair"] == "afro" and me["avatar"]["pet"]["breed"] == "Indie" and me["avatar"]["pet"]["name"] == "Bruno"
        assert c.put("/me", headers=h, json={"avatar": {"hair": "mohawk"}}).status_code == 422
        assert c.get("/me").status_code == 401


def test_friend_flow_and_search():
    with TestClient(app) as c:
        email = f"ravi{uuid.uuid4().hex[:6]}@example.com"
        ha, a = signup(c, "asha")
        hb, b = signup(c, "ravi", email)
        found = c.get("/users/search", params={"q": email}, headers=ha).json()["results"]
        assert [u["username"] for u in found] == [b["username"]] and found[0]["relation"] == "none"
        assert c.get("/users/search", params={"q": b["username"][:6]}, headers=ha).json()["results"]
        assert c.post("/friends/requests", headers=ha, json={"username": b["username"]}).json()["relation"] == "outgoing"
        assert [u["id"] for u in c.get("/friends", headers=hb).json()["incoming"]] == [a["id"]]
        assert c.post(f"/friends/{a['id']}/accept", headers=hb).status_code == 200
        assert [u["id"] for u in c.get("/friends", headers=ha).json()["friends"]] == [b["id"]]
        assert c.post("/friends/requests", headers=ha, json={"username": a["username"]}).status_code == 422


def test_shared_plan_is_the_same_for_every_member(stub_models):
    with TestClient(app) as c:
        ha, a = signup(c, "asha")
        hb, b = signup(c, "ravi")
        hc, _ = signup(c, "meera")
        c.post("/friends/requests", headers=ha, json={"username": b["username"]})
        c.post(f"/friends/{a['id']}/accept", headers=hb)

        r = c.post("/plans", headers=ha, json={
            "brief": BRIEF, "scene": "beach", "member_ids": [b["id"]],
            "constraints": {"headcount": 4, "budget": "14000 INR", "travel": ["train", "bus_private"]},
        })
        assert r.status_code == 200, r.text
        plan = r.json()
        assert {m["username"] for m in plan["members"]} == {a["username"], b["username"]}

        owner_view = events(c, plan["id"], ha)
        friend_view = events(c, plan["id"], hb)
        assert [e["type"] for e in owner_view][-2:] == ["final_plan", "done"]
        for x, y in zip(owner_view, friend_view):
            assert x == y, {k: (x.get(k), y.get(k)) for k in set(x) | set(y) if x.get(k) != y.get(k)}
        assert owner_view == friend_view  # same debate, same order, same content
        assert [e["seq"] for e in owner_view] == list(range(1, len(owner_view) + 1))

        # outsiders cannot see it until they use the invite link
        assert c.get(f"/plans/{plan['id']}", headers=hc).status_code == 404
        assert c.post("/plans/join", headers=hc, json={"code": plan["invite_code"]}).json()["id"] == plan["id"]
        assert events(c, plan["id"], hc) == owner_view

        listed = c.get("/plans", headers=hb).json()["plans"]
        assert listed[0]["id"] == plan["id"] and listed[0]["title"] == "Gokarna" and listed[0]["scene"] == "beach"


def test_only_friends_can_be_added(stub_models):
    with TestClient(app) as c:
        ha, _ = signup(c, "asha")
        _, stranger = signup(c, "zed")
        plan = c.post("/plans", headers=ha, json={"brief": BRIEF, "member_ids": [stranger["id"]]}).json()
        assert len(plan["members"]) == 1
        assert c.post(f"/plans/{plan['id']}/members", headers=ha, json={"user_id": stranger["id"]}).status_code == 403
        events(c, plan["id"], ha)  # let the debate finish before the client closes
