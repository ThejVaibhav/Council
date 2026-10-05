"""Phase 4 check: run the three PRD demo scenarios end to end against the real Gemini API.

Run from backend/ (Postgres up, GEMINI_API_KEY in .env):  python -m scripts.run_scenarios [index]
Prints the transcript as it streams and the time each debate took.
"""
import asyncio
import sys
import time

from app import db
from app.orchestrator import create_session, run_debate

SCENARIOS = [
    ("Tight weekend trip",
     "A two day weekend trip for three friends, budget eight thousand rupees total, somewhere within driving distance "
     "of Bengaluru. We want it relaxing rather than packed with activities.",
     {"budget": "8000 INR", "headcount": 3, "dates": "Saturday and Sunday", "location": "Bengaluru"}),
    ("Date night, early flight",
     "Date night for two in Bengaluru this Friday. One of us has a 6 am flight from Kempegowda airport on Saturday, so "
     "we need to be home early. Budget around three thousand rupees. We want it to feel special, not rushed.",
     {"budget": "3000 INR", "headcount": 2, "dates": "Friday evening", "location": "Bengaluru"}),
    ("Mixed-energy birthday",
     "Birthday outing for eight people in Bengaluru on Saturday. Half the group wants something active and loud, the "
     "other half wants a calm sit down evening, and two people do not drink. Budget fifteen hundred rupees per person.",
     {"budget": "1500 INR per person", "headcount": 8, "dates": "Saturday", "location": "Bengaluru"}),
]


async def emit(event: dict) -> None:
    kind = event["type"]
    if kind == "turn":
        cost = f" ({event['estimated_cost']:.0f})" if event["estimated_cost"] is not None else ""
        print(f"  [R{event['round']} {event['agent']}/{event['stance']}] {event['option_title']}{cost}\n    {event['commentary']}")
    elif kind == "final_plan":
        print(f"\n  FINAL: {event['title']} ({event['estimated_cost']})\n  {event['summary']}")
        for t in event["trade_off_log"]:
            print(f"   - {' vs '.join(t['agents_involved'])}: {t['disagreement']} -> {t['which_concern_won']}")
    elif kind in ("agent_error", "error"):
        print(f"  !! {event}")
    elif kind == "round_start":
        print(f"\n -- round {event['round']} --")


async def main() -> None:
    pool = await db.init_pool()
    picks = [SCENARIOS[int(sys.argv[1])]] if len(sys.argv) > 1 else SCENARIOS
    try:
        for title, brief, constraints in picks:
            print(f"\n===== {title} =====")
            start = time.monotonic()
            sid = await create_session(pool, brief, constraints)
            await run_debate(pool, sid, brief, constraints, emit)
            print(f"\n  session {sid} finished in {time.monotonic() - start:.1f}s")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
