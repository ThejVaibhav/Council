"""Agent personas and per-turn calls. System prompts are taken verbatim from AGENTS.md."""
import json

from app.config import get_settings
from app.llm import generate_structured
from app.schemas import ModeratorSynthesis, SpecialistTurn

SPECIALISTS = ("budget", "logistics", "vibe")

PROMPTS = {
    "budget": (
        "You are the Budget agent in a three agent planning council. You are given a brief describing what the user "
        "wants to plan and what their budget is. Your only job is to evaluate and propose options through the lens of "
        "cost. In round one, propose one or two concrete options that fit comfortably within budget, with a rough "
        "cost estimate for each. In round two, you will also see what the Logistics and Vibe agents proposed, react "
        "specifically to anything that risks exceeding budget, and say so plainly rather than softening it. You are "
        "allowed to concede a point if the other agents make a reasonable case that the extra cost is worth it, but "
        "you must say explicitly that you are conceding and why. Return your answer in the required structured "
        "format, plus a short plain language comment stating your position."
    ),
    "logistics": (
        "You are the Logistics agent in a three agent planning council. You are given a brief describing what the "
        "user wants to plan. Your only job is to evaluate feasibility, travel time and distance given the stated "
        "location, realistic availability for the dates given, and whether the plan actually works for the stated "
        "group size. In round one, propose one or two options that are logistically sound given the brief. In round "
        "two, you will also see what the Budget and Vibe agents proposed, flag anything that is not actually "
        "feasible as stated, for example a plan that assumes travel times that do not add up. Be specific about why "
        "something does not work, not just that it does not. Return your answer in the required structured format, "
        "plus a short plain language comment stating your position."
    ),
    "vibe": (
        "You are the Vibe agent in a three agent planning council. You are given a brief describing what the user "
        "wants to plan, including whatever they said about the kind of experience they are after, relaxing, "
        "adventurous, quiet, social. Your only job is to protect that intent. In round one, propose one or two "
        "options that genuinely deliver the experience the user described, not the safest or cheapest version of "
        "it. In round two, you will also see what the Budget and Logistics agents proposed, push back specifically "
        "where their optimizing has produced something that technically works but misses what the user actually "
        "wanted. Be concrete about what would be lost, not just that you disagree. Return your answer in the "
        "required structured format, plus a short plain language comment stating your position."
    ),
    "moderator": (
        "You are the Moderator in a three agent planning council. You are given the original brief and the full two "
        "round transcript from the Budget, Logistics, and Vibe agents. Your job is to produce one final plan. Where "
        "the three agents agreed, incorporate that directly. Where they disagreed, make a real decision, do not "
        "average three things into a bland compromise that satisfies nobody, and state which agent's concern you "
        "weighted more heavily and why, in one sentence per disagreement. Produce a short plain language summary of "
        "the final plan a user could act on immediately, plus the structured option data, plus the named trade off "
        "log. If the agents left a real conflict unresolved, say so rather than hiding it inside a vague summary."
    ),
}


def _format_turns(turns: dict[str, SpecialistTurn | None]) -> str:
    lines = []
    for agent in SPECIALISTS:
        t = turns.get(agent)
        body = json.dumps(t.model_dump()) if t else "(no response, this agent failed or timed out)"
        lines.append(f"{agent.capitalize()}: {body}")
    return "\n".join(lines)


FORMAT_NOTE = (
    "The structured fields hold one option: put your strongest option there. If you have a second option, name it "
    "and its rough cost briefly in your commentary. Keep commentary to two or three sentences in your own voice."
)


def round_one_message(brief: str) -> str:
    return f"Round one, proposal.\n\nBrief:\n{brief}\n\n{FORMAT_NOTE}"


def round_two_message(brief: str, agent: str, round_one: dict[str, SpecialistTurn | None]) -> str:
    others = " and ".join(a.capitalize() for a in SPECIALISTS if a != agent)
    return (
        f"Round two, reaction.\n\nBrief:\n{brief}\n\nRound one outputs:\n{_format_turns(round_one)}\n\n"
        f"React specifically to what the {others} agents proposed. Do not just restate your round one position. "
        "The structured option is the one you now back, yours or another agent's. Use stance support if you back "
        "another agent's option, flag if you are raising a concrete problem with one, propose if you are putting "
        "forward a revised option. Name the agent you are responding to in your commentary."
    )


def moderator_message(brief: str, round_one: dict, round_two: dict) -> str:
    return (
        f"Brief:\n{brief}\n\nRound one transcript:\n{_format_turns(round_one)}\n\n"
        f"Round two transcript:\n{_format_turns(round_two)}"
    )


async def run_specialist(agent: str, message: str) -> SpecialistTurn:
    return await generate_structured(
        model=get_settings().specialist_model, system_prompt=PROMPTS[agent], user_message=message, schema=SpecialistTurn
    )


async def run_moderator(message: str) -> ModeratorSynthesis:
    return await generate_structured(
        model=get_settings().moderator_model,
        system_prompt=PROMPTS["moderator"],
        user_message=message,
        schema=ModeratorSynthesis,
        timeout=get_settings().agent_timeout_seconds * 2,
    )


async def run_budget_round_one(brief: str) -> SpecialistTurn:
    return await run_specialist("budget", round_one_message(brief))
