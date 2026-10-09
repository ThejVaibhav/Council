"""The hand-rolled debate loop: round one, round two, moderator synthesis.

Each completed turn is persisted and passed to `emit` so the caller can stream it.
A failed specialist does not stop the run; it is reported and the Moderator is told about the gap.
"""
import asyncio
import logging
from typing import Awaitable, Callable
from uuid import UUID

import asyncpg

from app import agents
from app.schemas import ModeratorSynthesis, SpecialistTurn
from app.travel import describe
from app.validation import budget_basis, group_budget, validate_plan

log = logging.getLogger(__name__)
Emit = Callable[[dict], Awaitable[None]]


async def create_session(pool: asyncpg.Pool, brief: str, constraints: dict | None) -> UUID:
    return await pool.fetchval(
        "INSERT INTO sessions (brief_text, constraints, status) VALUES ($1, $2, 'pending') RETURNING id",
        brief,
        constraints or None,
    )


def _brief_with_constraints(brief: str, constraints: dict | None) -> str:
    if not constraints:
        return brief
    lines = []
    for k, v in constraints.items():
        if v in (None, "", []) or k in ("origin", "dest", "budget_basis"):
            continue
        if k == "budget":
            b = group_budget(constraints)
            if b and b["people"] > 1:
                lines.append(
                    f"- budget: {b['total']:,.0f} INR in total for the whole group of {b['people']} (about {b['per_person']:,.0f} INR each),"
                    f" given {'per person' if budget_basis(constraints) == 'per_person' else 'as a group total'}."
                    " Every estimated_cost must be the total for the whole group."
                )
            else:
                lines.append(f"- budget: {v}. Every estimated_cost must be the total for the whole group.")
            continue
        if k == "stops":
            legs = [f"{st.get('label') or 'a stop'}" + (f" by {describe([st['mode']])}" if st.get("mode") else "") for st in v]
            lines.append(f"- route, in order: {' -> '.join(legs)}. Keep these stops and, where given, these modes for each leg.")
            continue
        if k == "travel":
            modes = describe(v)
            if modes:
                lines.append(
                    f"- travel: the group is only open to {modes}. Plan with these modes only. If none of them"
                    " realistically serves a destination (no airport, no rail line, too far to ride), say so plainly."
                )
            continue
        lines.append(f"- {k}: {v}")
    return f"{brief}\n\nStructured constraints:\n" + "\n".join(lines) if lines else brief


async def _run_round(pool, session_id, round_no, messages: dict[str, str], emit: Emit, errors: dict | None = None) -> dict:
    results: dict[str, SpecialistTurn | None] = {}

    async def one(agent: str):
        try:
            turn = await agents.run_specialist(agent, messages[agent])
        except Exception as e:  # one agent failing must not hang or kill the run
            log.warning("%s round %s failed: %s", agent, round_no, e)
            results[agent] = None
            if errors is not None:
                errors[(agent, round_no)] = str(e)
            timed_out = "timed out" in str(e).lower() or isinstance(e, asyncio.TimeoutError)
            await emit({"type": "agent_error", "agent": agent, "round": round_no, "error": str(e), "reason": "timeout" if timed_out else "error"})
            return
        results[agent] = turn
        row = await pool.fetchrow(
            "INSERT INTO agent_turns (session_id, agent, round, option_title, description, estimated_cost, stance,"
            " commentary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at",
            session_id, agent, round_no, turn.option_title, turn.description, turn.estimated_cost, turn.stance,
            turn.commentary,
        )
        await emit({
            "type": "turn", "id": str(row["id"]), "agent": agent, "round": round_no,
            "created_at": row["created_at"].isoformat(), **turn.model_dump(),
        })

    await asyncio.gather(*(one(a) for a in agents.SPECIALISTS))
    return results


async def run_debate(pool: asyncpg.Pool, session_id: UUID, brief: str, constraints: dict | None, emit: Emit) -> None:
    full_brief = _brief_with_constraints(brief, constraints)
    await pool.execute("UPDATE sessions SET status='in_progress' WHERE id=$1", session_id)
    try:
        await emit({"type": "round_start", "round": 1})
        errors: dict = {}
        r1 = await _run_round(pool, session_id, 1, {a: agents.round_one_message(full_brief) for a in agents.SPECIALISTS}, emit, errors)
        if not any(r1.values()):
            raise RuntimeError("All three specialists failed in round one")

        await emit({"type": "round_start", "round": 2})
        r2 = await _run_round(
            pool, session_id, 2, {a: agents.round_two_message(full_brief, a, r1) for a in agents.SPECIALISTS}, emit, errors
        )

        await emit({"type": "moderator_start"})
        synthesis: ModeratorSynthesis = await agents.run_moderator(agents.moderator_message(full_brief, r1, r2))
        plan = synthesis.final_plan
        trade_offs = [t.model_dump() for t in synthesis.trade_off_log]
        # Checked before it is shown: a plan that fails here is presented as unverified, never as a decision.
        validation = validate_plan(brief, constraints, synthesis, r1, r2, errors)
        async with pool.acquire() as conn, conn.transaction():
            await conn.execute(
                "INSERT INTO agent_turns (session_id, agent, round, commentary) VALUES ($1,'moderator',NULL,$2)",
                session_id, synthesis.summary,
            )
            await conn.execute(
                "INSERT INTO final_plans (session_id, title, description, estimated_cost, summary, trade_off_log,"
                " cost_breakdown, validation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                session_id, plan.title, plan.description, plan.estimated_cost, synthesis.summary, trade_offs,
                [i.model_dump() for i in plan.cost_breakdown or []], validation,
            )
            await conn.execute("UPDATE sessions SET status='complete' WHERE id=$1", session_id)
        await emit({"type": "final_plan", **plan.model_dump(), "summary": synthesis.summary, "trade_off_log": trade_offs, "validation": validation})
    except asyncio.CancelledError:
        # client went away mid-debate; record it rather than leaving the session in_progress
        log.info("debate %s cancelled", session_id)
        await asyncio.shield(pool.execute("UPDATE sessions SET status='failed' WHERE id=$1", session_id))
        raise
    except Exception as e:
        log.exception("debate %s failed", session_id)
        await pool.execute("UPDATE sessions SET status='failed' WHERE id=$1", session_id)
        await emit({"type": "error", "error": str(e)})
        return
    await emit({"type": "done", "session_id": str(session_id)})
