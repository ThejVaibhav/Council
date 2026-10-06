import asyncio
import json
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Literal

from pydantic import BaseModel, Field

from app import db, plans, slots, users
from app.config import get_settings
from app.orchestrator import create_session, run_debate
from app.travel import TRAVEL_MODES


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="Council", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users.router)
app.include_router(plans.router)


_claim_slot = slots.claim
_release_slot = slots.release


class Constraints(BaseModel):
    budget: str | int | float | None = None
    headcount: int | None = Field(default=None, ge=1, le=100)
    dates: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    destination: str | None = Field(default=None, max_length=200)
    travel: list[Literal[tuple(TRAVEL_MODES)]] | None = Field(default=None, max_length=len(TRAVEL_MODES))  # type: ignore[valid-type]


class BriefIn(BaseModel):
    brief: str = Field(min_length=10, max_length=4000)
    constraints: Constraints | None = None

    def constraint_dict(self) -> dict | None:
        if self.constraints is None:
            return None
        d = self.constraints.model_dump(exclude_none=True)
        return d or None


@app.get("/health")
async def health():
    settings = get_settings()
    db_ok = True
    try:
        await db.get_pool().fetchval("SELECT 1")
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "gemini_key_configured": bool(settings.gemini_api_key),
    }


@app.post("/sessions")
async def run_session(body: BriefIn):
    """Run the whole debate and return when it finishes (Phase 2 endpoint, no streaming)."""
    _claim_slot()
    try:
        pool = db.get_pool()
        constraints = body.constraint_dict()
        session_id = await create_session(pool, body.brief, constraints)
        events: list[dict] = []

        async def emit(event: dict):
            events.append(event)

        await run_debate(pool, session_id, body.brief, constraints, emit)
    finally:
        _release_slot()
    return {"session_id": str(session_id), "events": events}


@app.post("/sessions/stream")
async def stream_session(body: BriefIn):
    """Run the debate and stream one Server Sent Event per turn as it completes."""
    _claim_slot()
    try:
        pool = db.get_pool()
        constraints = body.constraint_dict()
        session_id = await create_session(pool, body.brief, constraints)
    except BaseException:
        _release_slot()
        raise
    queue: asyncio.Queue[dict | None] = asyncio.Queue()

    async def worker():
        try:
            await run_debate(pool, session_id, body.brief, constraints, queue.put)
        finally:
            _release_slot()
            queue.put_nowait(None)

    # Started here, not inside the generator, so the slot is always released even if streaming never begins.
    task = asyncio.create_task(worker())

    async def events():
        yield f"event: session\ndata: {json.dumps({'session_id': str(session_id)})}\n\n"
        try:
            while (event := await queue.get()) is not None:
                yield f"event: {event['type']}\ndata: {json.dumps(event, default=str)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/sessions/{session_id}")
async def get_session(session_id: UUID):
    pool = db.get_pool()
    session = await pool.fetchrow("SELECT * FROM sessions WHERE id=$1", session_id)
    if not session:
        raise HTTPException(404, "session not found")
    turns = await pool.fetch("SELECT * FROM agent_turns WHERE session_id=$1 ORDER BY created_at", session_id)
    plan = await pool.fetchrow("SELECT * FROM final_plans WHERE session_id=$1", session_id)
    return {"session": dict(session), "turns": [dict(t) for t in turns], "final_plan": dict(plan) if plan else None}
