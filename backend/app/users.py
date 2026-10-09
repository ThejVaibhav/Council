"""Accounts, profiles and friends."""
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app import db
from app.config import get_settings
from app.avatar import PET_BREEDS, Avatar
from app.security import hash_password, new_token, verify_password

router = APIRouter()

USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOKEN_DAYS = 30
PUBLIC = "id, username, display_name, avatar"


def public(row) -> dict:
    return {"id": str(row["id"]), "username": row["username"], "display_name": row["display_name"], "avatar": row["avatar"] or {}}


async def current_user(authorization: str | None = Header(default=None)) -> asyncpg.Record:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in to continue.")
    token = authorization.split(" ", 1)[1].strip()
    row = await db.get_pool().fetchrow(
        f"SELECT u.{PUBLIC.replace(', ', ', u.')}, u.email FROM auth_tokens t JOIN users u ON u.id = t.user_id"
        " WHERE t.token = $1 AND t.expires_at > now()",
        token,
    )
    if not row:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    return row


class SignupIn(BaseModel):
    username: str
    display_name: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=8, max_length=128)
    email: str | None = None


class LoginIn(BaseModel):
    login: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=128)


async def _issue(user_id: UUID) -> str:
    token = new_token()
    await db.get_pool().execute(
        "INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
        token, user_id, datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
    )
    return token


def _me(row) -> dict:
    return {**public(row), "email": row["email"]}


@router.post("/auth/signup")
async def signup(body: SignupIn):
    username = body.username.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(422, "Usernames are 3 to 20 characters: letters, numbers, dots and underscores.")
    email = body.email.strip().lower() if body.email and body.email.strip() else None
    if email and not EMAIL_RE.match(email):
        raise HTTPException(422, "That email address does not look right.")
    try:
        row = await db.get_pool().fetchrow(
            f"INSERT INTO users (username, email, display_name, password_hash, avatar) VALUES ($1, $2, $3, $4, $5)"
            f" RETURNING {PUBLIC}, email",
            username, email, body.display_name.strip(), hash_password(body.password), Avatar().model_dump(),
        )
    except asyncpg.UniqueViolationError as e:
        field = "email address" if "email" in str(e) else "username"
        raise HTTPException(409, f"That {field} is already taken.") from e
    return {"token": await _issue(row["id"]), "user": _me(row)}


# Slow down password guessing: at most 8 failed attempts per login name every 10 minutes.
_failures: dict[str, deque] = defaultdict(deque)
MAX_FAILURES, WINDOW = 8, 600


def _too_many(key: str) -> bool:
    q = _failures[key]
    while q and q[0] < time.monotonic() - WINDOW:
        q.popleft()
    return len(q) >= MAX_FAILURES


@router.post("/auth/login")
async def login(body: LoginIn):
    key = body.login.strip().lower().lstrip("@")
    if _too_many(key):
        raise HTTPException(429, "Too many attempts. Wait a few minutes and try again.")
    row = await db.get_pool().fetchrow(
        f"SELECT {PUBLIC}, email, password_hash FROM users WHERE username = $1 OR email = $1", key
    )
    if row and row["password_hash"] is None:
        raise HTTPException(401, "This account uses Google sign-in. Use Continue with Google.")
    if not row or not verify_password(body.password, row["password_hash"]):
        _failures[key].append(time.monotonic())
        raise HTTPException(401, "Wrong username, email or password.")
    _failures.pop(key, None)
    return {"token": await _issue(row["id"]), "user": _me(row)}


@router.get("/config")
async def public_config():
    """What the sign-in page needs to know: whether Google sign-in is on, and its client ID."""
    return {"google_client_id": get_settings().google_client_id or None}


class GoogleIn(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)


async def verify_google(credential: str) -> dict:
    """Checks a Google ID token with Google and returns its claims."""
    client_id = get_settings().google_client_id
    if not client_id:
        raise HTTPException(503, "Google sign-in is not set up on this server.")
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": credential})
    claims = r.json() if r.status_code == 200 else {}
    if claims.get("aud") != client_id or claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Google sign-in could not be verified. Try again.")
    if str(claims.get("email_verified")).lower() != "true":
        raise HTTPException(401, "Your Google email is not verified.")
    return claims


async def _free_username(base: str) -> str:
    base = re.sub(r"[^a-z0-9_.]", "", base.lower())[:16] or "traveller"
    base = base if len(base) >= 3 else f"{base}_go"
    pool = db.get_pool()
    for i in range(50):
        name = base if i == 0 else f"{base[:16]}{secrets.randbelow(9000) + 1000}"
        if not await pool.fetchval("SELECT 1 FROM users WHERE username = $1", name):
            return name
    return f"user{secrets.token_hex(4)}"


@router.post("/auth/google")
async def google_sign_in(body: GoogleIn):
    """Signs in with Google, creating the account the first time and linking it to an existing email."""
    claims = await verify_google(body.credential)
    sub, email = claims["sub"], claims["email"].strip().lower()
    pool = db.get_pool()
    row = await pool.fetchrow(f"SELECT {PUBLIC}, email FROM users WHERE google_sub = $1", sub)
    is_new = False
    if not row:
        row = await pool.fetchrow(f"UPDATE users SET google_sub = $2 WHERE email = $1 AND google_sub IS NULL RETURNING {PUBLIC}, email", email, sub)
    if not row:
        name = (claims.get("given_name") or claims.get("name") or email.split("@")[0])[:40]
        row = await pool.fetchrow(
            f"INSERT INTO users (username, email, display_name, google_sub, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING {PUBLIC}, email",
            await _free_username(email.split("@")[0]), email, name, sub, Avatar().model_dump(),
        )
        is_new = True
    return {"token": await _issue(row["id"]), "user": _me(row), "is_new": is_new}


@router.post("/auth/logout")
async def logout(authorization: str | None = Header(default=None), user=Depends(current_user)):
    await db.get_pool().execute("DELETE FROM auth_tokens WHERE token = $1", authorization.split(" ", 1)[1].strip())
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(current_user)):
    return _me(user)


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=40)
    avatar: Avatar | None = None
    email: str | None = Field(default=None, max_length=200)  # "" clears it


@router.put("/me")
async def update_me(body: ProfileIn, user=Depends(current_user)):
    pool = db.get_pool()
    if body.email is not None:
        email = body.email.strip().lower() or None
        if email and not EMAIL_RE.match(email):
            raise HTTPException(422, "That email address does not look right.")
        try:
            await pool.execute("UPDATE users SET email = $2 WHERE id = $1", user["id"], email)
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "That email address is already used by another account.")
    row = await pool.fetchrow(
        f"UPDATE users SET display_name = COALESCE($2, display_name), avatar = COALESCE($3, avatar)"
        f" WHERE id = $1 RETURNING {PUBLIC}, email",
        user["id"], body.display_name.strip() if body.display_name else None, body.avatar.model_dump() if body.avatar else None,
    )
    return _me(row)


@router.get("/pets/breeds")
async def breeds():
    return PET_BREEDS


async def _relation(me_id: UUID, other_id: UUID) -> str:
    row = await db.get_pool().fetchrow(
        "SELECT requester_id, status FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)",
        me_id, other_id,
    )
    if not row:
        return "none"
    if row["status"] == "accepted":
        return "friends"
    return "outgoing" if row["requester_id"] == me_id else "incoming"


@router.get("/users/search")
async def search(q: str, user=Depends(current_user)):
    q = q.strip().lower()
    if len(q) < 2:
        return {"results": []}
    pool = db.get_pool()
    if "@" in q:
        rows = await pool.fetch(f"SELECT {PUBLIC} FROM users WHERE email = $1 AND id <> $2", q, user["id"])
    else:
        rows = await pool.fetch(
            f"SELECT {PUBLIC} FROM users WHERE (username LIKE $1 OR lower(display_name) LIKE $1) AND id <> $2 ORDER BY username LIMIT 10",
            q.lstrip("@").replace("%", "").replace("_", r"\_") + "%", user["id"],
        )
    return {"results": [{**public(r), "relation": await _relation(user["id"], r["id"])} for r in rows]}


class FriendRequestIn(BaseModel):
    username: str


@router.post("/friends/requests")
async def request_friend(body: FriendRequestIn, user=Depends(current_user)):
    pool = db.get_pool()
    other = await pool.fetchrow(f"SELECT {PUBLIC} FROM users WHERE username = $1", body.username.strip().lower().lstrip("@"))
    if not other:
        raise HTTPException(404, "No one with that username.")
    if other["id"] == user["id"]:
        raise HTTPException(422, "That is you.")
    relation = await _relation(user["id"], other["id"])
    if relation == "friends":
        return {"relation": "friends", "user": public(other)}
    if relation == "incoming":  # they already asked: accepting is what the user means
        await pool.execute(
            "UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2", other["id"], user["id"]
        )
        return {"relation": "friends", "user": public(other)}
    if relation == "none":
        await pool.execute("INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)", user["id"], other["id"])
    return {"relation": "outgoing", "user": public(other)}


@router.get("/friends")
async def friends(user=Depends(current_user)):
    rows = await db.get_pool().fetch(
        f"""SELECT u.{PUBLIC.replace(', ', ', u.')}, f.status, f.requester_id
            FROM friendships f JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
            WHERE f.requester_id = $1 OR f.addressee_id = $1 ORDER BY u.display_name""",
        user["id"],
    )
    out = {"friends": [], "incoming": [], "outgoing": []}
    for r in rows:
        key = "friends" if r["status"] == "accepted" else ("outgoing" if r["requester_id"] == user["id"] else "incoming")
        out[key].append(public(r))
    return out


@router.post("/friends/{other_id}/accept")
async def accept(other_id: UUID, user=Depends(current_user)):
    done = await db.get_pool().execute(
        "UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'",
        other_id, user["id"],
    )
    if done.endswith(" 0"):
        raise HTTPException(404, "No pending request from that person.")
    return {"relation": "friends"}


@router.delete("/friends/{other_id}")
async def remove(other_id: UUID, user=Depends(current_user)):
    await db.get_pool().execute(
        "DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)",
        user["id"], other_id,
    )
    return {"relation": "none"}


async def are_friends(a: UUID, b: UUID) -> bool:
    return await _relation(a, b) == "friends"
