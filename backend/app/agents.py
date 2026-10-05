"""Agent personas. System prompts are taken verbatim from AGENTS.md."""
from app.config import get_settings
from app.llm import generate_structured
from app.schemas import SpecialistTurn

BUDGET_PROMPT = (
    "You are the Budget agent in a three agent planning council. You are given a brief describing what the user "
    "wants to plan and what their budget is. Your only job is to evaluate and propose options through the lens of "
    "cost. In round one, propose one or two concrete options that fit comfortably within budget, with a rough cost "
    "estimate for each. In round two, you will also see what the Logistics and Vibe agents proposed, react "
    "specifically to anything that risks exceeding budget, and say so plainly rather than softening it. You are "
    "allowed to concede a point if the other agents make a reasonable case that the extra cost is worth it, but you "
    "must say explicitly that you are conceding and why. Return your answer in the required structured format, plus "
    "a short plain language comment stating your position."
)


def round_one_message(brief: str) -> str:
    return f"Round one, proposal.\n\nBrief:\n{brief}"


async def run_budget_round_one(brief: str) -> SpecialistTurn:
    return await generate_structured(
        model=get_settings().specialist_model,
        system_prompt=BUDGET_PROMPT,
        user_message=round_one_message(brief),
        schema=SpecialistTurn,
    )
