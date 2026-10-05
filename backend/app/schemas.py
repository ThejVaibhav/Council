from typing import Literal

from pydantic import BaseModel, Field


class SpecialistTurn(BaseModel):
    """One specialist turn, the shape defined in AGENTS.md."""

    option_title: str = Field(description="Short name for the option this turn proposes, supports, or flags.")
    description: str = Field(description="Two or three concrete sentences describing the option.")
    estimated_cost: float | None = Field(
        description="Total estimated cost in the brief's currency, or null where cost is not applicable."
    )
    stance: Literal["propose", "support", "flag"] = Field(
        description="propose a new option, support another agent's option, or flag a problem with one."
    )
    commentary: str = Field(description="Short plain language comment stating your position, shown in the transcript.")


class TradeOff(BaseModel):
    agents_involved: list[Literal["budget", "logistics", "vibe"]] = Field(
        description="The two agents whose positions conflicted."
    )
    disagreement: str = Field(description="What the disagreement was, one sentence.")
    which_concern_won: str = Field(description="Which agent's concern won and why, one sentence.")


class FinalPlan(BaseModel):
    title: str
    description: str = Field(description="Concrete plan a user could act on immediately.")
    estimated_cost: float | None = Field(description="Total estimated cost, or null if not applicable.")


class ModeratorSynthesis(BaseModel):
    final_plan: FinalPlan
    trade_off_log: list[TradeOff]
    summary: str = Field(description="Plain language paragraph shown as the headline result.")
