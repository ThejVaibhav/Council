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


COST_CATEGORIES = ("fuel", "tolls", "fare", "rental", "stay", "food", "fees", "other")
MODES = ("own_car", "rental", "bike", "cab", "bus_state", "bus_private", "train", "flight", "walk")


class CostItem(BaseModel):
    item: str = Field(description="What the money is for, e.g. fuel Bengaluru to Kadapa, bus fare Kadapa to Vizag.")
    amount: float = Field(description="Cost of this item for the whole group, in the brief's currency.")
    category: Literal[COST_CATEGORIES] | None = Field(  # type: ignore[valid-type]
        default=None, description="fuel, tolls, fare, rental, stay, food, fees or other."
    )
    assumption: str | None = Field(
        default=None, description="How the amount was worked out, e.g. '700 km x Rs 1.3/km state bus, 1 seat'."
    )


class ItineraryLeg(BaseModel):
    day: int = Field(ge=1, le=60, description="Trip day the leg departs, 1 for the first day.")
    depart: str = Field(description="Departure time, 24-hour HH:MM.")
    from_place: str
    to_place: str
    mode: Literal[MODES]  # type: ignore[valid-type]
    vehicle: Literal["own", "rental", "public"] = Field(
        description="own: the group's own car or bike, which must already be at from_place. rental: hired at from_place "
        "(add a rental cost). public: bus, train, flight or cab."
    )
    hours: float = Field(ge=0, le=72, description="Realistic door-to-door hours, including ghat roads and stops.")
    arrive_day: int = Field(ge=1, le=60, description="Trip day the leg arrives; an overnight leg arrives the next day.")
    arrive: str = Field(description="Arrival time, 24-hour HH:MM.")


class FinalPlan(BaseModel):
    title: str
    description: str = Field(description="Concrete plan a user could act on immediately.")
    estimated_cost: float | None = Field(description="Total estimated cost for the whole group, or null if not applicable.")
    cost_breakdown: list[CostItem] | None = Field(
        default=None, description="Line items for the whole group that add up to estimated_cost."
    )
    headcount: int | None = Field(default=None, ge=1, le=100, description="How many people this plan is costed for.")
    itinerary: list[ItineraryLeg] | None = Field(
        default=None, description="Every leg in order, including the journey back to the start unless the brief is one way."
    )


class ModeratorSynthesis(BaseModel):
    final_plan: FinalPlan
    trade_off_log: list[TradeOff]
    summary: str = Field(description="Plain language paragraph shown as the headline result.")
