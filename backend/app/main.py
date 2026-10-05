import asyncio
import json
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app import db
from app.config import get_settings
from app.orchestrator import create_session, run_debate


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


class BriefIn(BaseModel):
    brief: str = Field(min_length=10, max_length=4000)
    constraints: dict | None = None


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
    pool = db.get_pool()
    session_id = await create_session(pool, body.brief, body.constraints)
    events: list[dict] = []

    async def emit(event: dict):
        events.append(event)

    await run_debate(pool, session_id, body.brief, body.constraints, emit)
    return {"session_id": str(session_id), "events": events}


@app.post("/sessions/stream")
async def stream_session(body: BriefIn):
    """Run the debate and stream one Server Sent Event per turn as it completes."""
    pool = db.get_pool()
    session_id = await create_session(pool, body.brief, body.constraints)
    queue: asyncio.Queue[dict | None] = asyncio.Queue()

    async def worker():
        try:
            await run_debate(pool, session_id, body.brief, body.constraints, queue.put)
        finally:
            await queue.put(None)

    async def events():
        task = asyncio.create_task(worker())
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
