"""Google sign-in, public config and the /api prefix used by the single-service deploy."""
import uuid

from fastapi.testclient import TestClient

from app import users
from app.main import app


def fake_google(monkeypatch, sub, email, name="Alex"):
    async def verify(credential):
        return {"sub": sub, "email": email, "email_verified": "true", "given_name": name}

    monkeypatch.setattr(users, "verify_google", verify)


def test_google_creates_then_reuses_account(monkeypatch):
    sub, email = uuid.uuid4().hex, f"g{uuid.uuid4().hex[:8]}@gmail.com"
    fake_google(monkeypatch, sub, email)
    with TestClient(app) as c:
        first = c.post("/auth/google", json={"credential": "x" * 40}).json()
        assert first["is_new"] is True and first["user"]["email"] == email
        again = c.post("/auth/google", json={"credential": "x" * 40}).json()
        assert again["is_new"] is False and again["user"]["id"] == first["user"]["id"]
        assert c.get("/me", headers={"Authorization": f"Bearer {again['token']}"}).status_code == 200
        r = c.post("/auth/login", json={"login": email, "password": "anything"})
        assert r.status_code == 401 and "Google" in r.json()["detail"]


def test_google_links_existing_email(monkeypatch):
    email = f"l{uuid.uuid4().hex[:8]}@gmail.com"
    with TestClient(app) as c:
        made = c.post("/auth/signup", json={"username": f"l_{uuid.uuid4().hex[:6]}", "display_name": "Lee", "password": "correct-horse", "email": email}).json()
        fake_google(monkeypatch, uuid.uuid4().hex, email)
        r = c.post("/auth/google", json={"credential": "x" * 40}).json()
        assert r["is_new"] is False and r["user"]["id"] == made["user"]["id"]


def test_google_disabled_without_client_id():
    with TestClient(app) as c:
        assert c.post("/auth/google", json={"credential": "x" * 40}).status_code == 503


def test_config_and_api_prefix():
    with TestClient(app) as c:
        assert "google_client_id" in c.get("/config").json()
        assert c.get("/api/config").json() == c.get("/config").json()
        assert c.get("/api/health").status_code == 200


def test_google_access_token_flow(monkeypatch):
    sub, email = uuid.uuid4().hex, f"a{uuid.uuid4().hex[:8]}@gmail.com"

    async def verify(token):
        return {"sub": sub, "email": email, "email_verified": True, "given_name": "Sam"}

    monkeypatch.setattr(users, "verify_google_access", verify)
    with TestClient(app) as c:
        r = c.post("/auth/google", json={"access_token": "y" * 40}).json()
        assert r["is_new"] is True and r["user"]["display_name"] == "Sam"
        assert c.post("/auth/google", json={}).status_code == 422
