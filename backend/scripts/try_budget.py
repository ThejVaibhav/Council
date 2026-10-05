"""Phase 1 check: run the Budget agent once against the real Gemini API.

Run from backend/:  python -m scripts.try_budget
"""
import asyncio

from app.agents import run_budget_round_one

BRIEF = (
    "A two day weekend trip for three people, budget eight thousand rupees total, somewhere within driving "
    "distance of Bengaluru, relaxing rather than packed with activities."
)


async def main() -> None:
    turn = await run_budget_round_one(BRIEF)
    print(turn.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
