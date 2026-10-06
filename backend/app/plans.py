"""Shared plans: one debate, run once on the server, watched live by everyone in the plan."""
import asyncio
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Literal

from pydantic import BaseModel, Field

from app import broker, db, slots
from app.orchestrator import create_session, run_debate
from app.travel import TRAVEL_MODES
from app.security import new_invite_code
from app.users import PUBLIC, are_friends, current_user, public

router = APIRouter(prefix="/plans")
log = logging.getLogger(__name__)
_tasks: set[asyncio.Task] = set()  # keep running debates referenced until they finish

TERMINAL = {"done", "error"}


class Constraints(BaseModel):
    budget: str | int | float | None = None
    headcount: int | None = Field(default=None, ge=1, le=100)
    dates: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    destination: str | None = Field(default=None, max_length=200)
    travel: list[Literal[tuple(TRAVEL_MODES)]] | None = Field(default=None, max_length=len(TRAVEL_MODES))  # type: ignore[valid-type]


class PlanIn(BaseModel):
    brief: str = Field(min_length=10, max_length=4000)
    constraints: Constraints | None = None
    scene: str | None = Field(default=None, max_length=30)
    member_ids: list[UUID] = Field(default_factory=list, max_length=19)


async def _members(session_id: UUID) -> list[dict]:
    rows = await db.get_pool().fetch(
        f"SELECT u.{PUBLIC.replace(', ', ', u.')}, m.role FROM plan_members m JOIN users u ON u.id = m.user_id"
        " WHERE m.session_id = $1 ORDER BY m.role DESC, m.joined_at",
        session_id,
    )
    return [{**public(r), "role": r["role"]} for r in rows]


async def _require_member(session_id: UUID, user_id: UUID):
    row = await db.get_pool().fetchrow(
        "SELECT s.* FROM sessions s JOIN plan_members m ON m.session_id = s.id WHERE s.id = $1 AND m.user_id = $2",
        session_id, user_id,
    )
    if not row:
        raise HTTPException(404, "Plan not found, or you are not part of it.")
    return row


async def _run(session_id: UUID, brief: str, constraints: dict | None) -> None:
    pool = db.get_pool()
    seq = 0
    lock = asyncio.Lock()

    async def emit(event: dict) -> None:
        # Agents finish in parallel; numbering, storing and publishing must happen as one step per event,
        # or a live viewer can receive seq 3 before seq 2 and drop 2 as already seen.
        nonlocal seq
        async with lock:
            seq += 1
            event = {**event, "seq": seq}
            await pool.execute(
                "INSERT INTO session_events (session_id, seq, type, payload) VALUES ($1, $2, $3, $4)",
                session_id, seq, event["type"], event,
            )
            broker.publish(session_id, event)

    try:
        await run_debate(pool, session_id, brief, constraints, emit)
    finally:
        slots.release()


def _summary(row, members, title=None) -> dict:
    return {
        "id": str(row["id"]),
        "brief": row["brief_text"],
        "constraints": row["constraints"],
        "scene": row["scene"],
        "status": row["status"],
        "created_at": row["created_at"].isoformat(),
        "invite_code": row["invite_code"],
        "title": title,
        "members": members,
    }


@router.post("")
async def create_plan(body: PlanIn, user=Depends(current_user)):
    slots.claim()
    try:
        pool = db.get_pool()
        constraints = body.constraints.model_dump(exclude_none=True) if body.constraints else None
        session_id = await create_session(pool, body.brief, constraints or None)
        row = await pool.fetchrow(
            "UPDATE sessions SET owner_id = $2, invite_code = $3, scene = $4 WHERE id = $1 RETURNING *",
            session_id, user["id"], new_invite_code(), body.scene,
        )
        await pool.execute("INSERT INTO plan_members (session_id, user_id, role) VALUES ($1, $2, 'owner')", session_id, user["id"])
        for mid in dict.fromkeys(body.member_ids):
            if mid != user["id"] and await are_friends(user["id"], mid):
                await pool.execute("INSERT INTO plan_members (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", session_id, mid)
    except BaseException:
        slots.release()
        raise
    task = asyncio.create_task(_run(session_id, body.brief, constraints or None))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return _summary(row, await _members(session_id))


@router.get("")
async def my_plans(user=Depends(current_user)):
    rows = await db.get_pool().fetch(
        """SELECT s.*, f.title FROM sessions s JOIN plan_members m ON m.session_id = s.id
           LEFT JOIN final_plans f ON f.session_id = s.id
           WHERE m.user_id = $1 ORDER BY s.created_at DESC LIMIT 50""",
        user["id"],
    )
    return {"plans": [_summary(r, await _members(r["id"]), r["title"]) for r in rows]}


@router.get("/{session_id}")
async def get_plan(session_id: UUID, user=Depends(current_user)):
    row = await _require_member(session_id, user["id"])
    title = await db.get_pool().fetchval("SELECT title FROM final_plans WHERE session_id = $1", session_id)
    return _summary(row, await _members(session_id), title)


class MemberIn(BaseModel):
    user_id: UUID


@router.post("/{session_id}/members")
async def add_member(session_id: UUID, body: MemberIn, user=Depends(current_user)):
    await _require_member(session_id, user["id"])
    if not await are_friends(user["id"], body.user_id):
        raise HTTPException(403, "You can add friends to a plan. Share the invite link with anyone else.")
    await db.get_pool().execute(
        "INSERT INTO plan_members (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", session_id, body.user_id
    )
    return {"members": await _members(session_id)}


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=40)


@router.post("/join")
async def join(body: JoinIn, user=Depends(current_user)):
    pool = db.get_pool()
    session_id = await pool.fetchval("SELECT id FROM sessions WHERE invite_code = $1", body.code.strip())
    if not session_id:
        raise HTTPException(404, "That invite link is not valid.")
    await pool.execute("INSERT INTO plan_members (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", session_id, user["id"])
    return {"id": str(session_id)}


def _sse(event: dict) -> str:
    return f"event: {event['type']}\ndata: {json.dumps(event, default=str)}\n\n"


@router.get("/{session_id}/stream")
async def stream(session_id: UUID, user=Depends(current_user)):
    """Replays every stored event, then follows the live debate until it ends."""
    await _require_member(session_id, user["id"])
    queue = broker.subscribe(session_id)  # subscribe before reading so nothing falls in the gap
    pool = db.get_pool()

    async def events():
        try:
            last = 0
            ended = False
            for r in await pool.fetch("SELECT payload FROM session_events WHERE session_id = $1 ORDER BY seq", session_id):
                ev = r["payload"]
                last = ev["seq"]
                ended = ev["type"] in TERMINAL
                yield _sse(ev)
            if not ended:
                status = await pool.fetchval("SELECT status FROM sessions WHERE id = $1", session_id)
                running = status in ("pending", "in_progress")
                while running:
                    try:
                        ev = await asyncio.wait_for(queue.get(), timeout=15)
                    except asyncio.TimeoutError:
                        yield ": keep-alive\n\n"
                        status = await pool.fetchval("SELECT status FROM sessions WHERE id = $1", session_id)
                        running = status in ("pending", "in_progress")
                        continue
                    if ev["seq"] <= last:
                        continue
                    last = ev["seq"]
                    yield _sse(ev)
                    if ev["type"] in TERMINAL:
                        break
        finally:
            broker.unsubscribe(session_id, queue)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
