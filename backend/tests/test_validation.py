"""Post-debate checks: geography, travel time, budget arithmetic, missing information and agent timeouts."""
from app.schemas import CostItem, FinalPlan, ItineraryLeg, ModeratorSynthesis, SpecialistTurn
from app.validation import group_budget, participation, trip_days, validate_plan

BLR = {"lat": 12.97, "lon": 77.59, "label": "Bengaluru"}
COORG = {"lat": 12.42, "lon": 75.74, "label": "Coorg"}
BURKINA = {"lat": 12.37, "lon": -1.52, "label": "Waterfalls, Burkina Faso"}
KODAI = {"lat": 10.24, "lon": 77.49, "label": "Kodaikanal"}
DELHI = {"lat": 28.61, "lon": 77.21, "label": "Delhi"}
LEH = {"lat": 34.15, "lon": 77.58, "label": "Leh"}


def turn(stance="propose", cost=7000):
    return SpecialistTurn(option_title="x", description="d", estimated_cost=cost, stance=stance, commentary="c")


def synth(cost=7500, breakdown=None, itinerary=None, headcount=None, summary="s", description="d"):
    return ModeratorSynthesis(final_plan=FinalPlan(title="t", description=description, estimated_cost=cost, cost_breakdown=breakdown, itinerary=itinerary, headcount=headcount), trade_off_log=[], summary=summary)


ALL = {a: turn() for a in ("budget", "logistics", "vibe")}


def levels(v, area):
    return [c["level"] for c in v["checks"] if c["area"] == area]


def leg(day, dep, a, b, mode, vehicle, hours, aday, arr):
    return ItineraryLeg(day=day, depart=dep, from_place=a, to_place=b, mode=mode, vehicle=vehicle, hours=hours, arrive_day=aday, arrive=arr)


COORG_TRIP = {"budget": "8000", "headcount": 3, "dates": "Sat 10 – Sun 11 Oct 2026", "origin": BLR, "dest": COORG, "travel": ["own_car"]}
COORG_LEGS = [leg(1, "06:00", "Bengaluru", "Coorg", "own_car", "own", 6, 1, "12:00"), leg(2, "14:00", "Coorg", "Bengaluru", "own_car", "own", 6, 2, "20:00")]
COORG_COSTS = [CostItem(item="Fuel", amount=3600, category="fuel"), CostItem(item="Stay", amount=1600, category="stay"), CostItem(item="Food", amount=2000, category="food")]


def test_clean_weekend_trip_is_verified():
    v = validate_plan("weekend in Coorg", COORG_TRIP, synth(7200, COORG_COSTS, COORG_LEGS, 3), ALL, ALL)
    assert v["status"] == "verified", v["checks"]


def test_without_an_itinerary_the_plan_needs_review():
    v = validate_plan("weekend in Coorg", COORG_TRIP, synth(7200, COORG_COSTS, None, 3), ALL, ALL)
    assert v["status"] == "needs_review"


def test_location_on_another_continent_is_rejected():
    c = {"budget": "8000", "headcount": 3, "origin": BLR, "stops": [{**COORG, "mode": "own_car"}, {**BURKINA, "mode": "own_car"}, {**KODAI, "mode": "own_car"}]}
    v = validate_plan("2-day trip", c, synth(), ALL, ALL)
    assert v["status"] == "not_verified"
    assert any("Burkina Faso" in c["message"] and c["level"] == "error" for c in v["checks"])


def test_unrealistic_road_distance_is_rejected_but_flight_is_fine():
    by_road = {"origin": BLR, "stops": [{**LEH, "mode": "bike"}]}
    assert "error" in levels(validate_plan("trip", by_road, synth(), ALL, ALL), "geography")
    flying = {"origin": BLR, "stops": [{**LEH, "mode": "flight"}]}
    assert "error" not in levels(validate_plan("trip", flying, synth(), ALL, ALL), "geography")
    # Drivable, but not in a weekend: that is a time problem, not a geography one.
    weekend = {"origin": BLR, "dest": DELHI, "travel": ["own_car"], "dates": "Sat 17 – Sun 18 Oct 2026"}
    v = validate_plan("trip", weekend, synth(), ALL, ALL)
    assert "error" not in levels(v, "geography") and "error" in levels(v, "feasibility")


def test_too_much_driving_for_the_days_available():
    c = {"origin": BLR, "stops": [{**KODAI, "mode": "own_car"}, {"lat": 17.69, "lon": 83.22, "label": "Vizag", "mode": "own_car"}], "dates": "Sat 10 Oct 2026"}
    v = validate_plan("day trip", c, synth(), ALL, ALL)
    assert "error" in levels(v, "feasibility")


def test_budget_total_versus_per_person():
    assert group_budget({"budget": "8000", "headcount": 4, "budget_basis": "total"})["total"] == 8000
    per = group_budget({"budget": "2000", "headcount": 4, "budget_basis": "per_person"})
    assert per["total"] == 8000 and per["per_person"] == 2000
    assert group_budget({"budget": "1,500 each", "headcount": 8})["total"] == 12000  # basis read from the text
    assert group_budget({"budget": "8k"})["total"] == 8000
    assert group_budget({"budget": "flexible"}) is None


def test_over_budget_and_breakdown_that_does_not_add_up():
    c = {"budget": "2000", "headcount": 3, "budget_basis": "per_person"}  # 6,000 for the group
    v = validate_plan("trip", c, synth(7500), ALL, ALL)
    assert v["status"] == "not_verified" and any("over the 6,000" in x["message"] for x in v["checks"])
    bad = [CostItem(item="fuel", amount=1000), CostItem(item="stay", amount=1000)]
    v = validate_plan("trip", {"budget": "8000"}, synth(7500, bad), ALL, ALL)
    assert any("adds up to 2,000" in x["message"] for x in v["checks"])


def test_missing_information_is_reported_not_guessed():
    v = validate_plan("somewhere nice", {}, synth(None), ALL, ALL)
    msgs = " ".join(x["message"] for x in v["checks"])
    assert "No budget" in msgs and "No starting point" in msgs and "no total cost" in msgs


def test_timeouts_and_consensus():
    r2 = {"budget": turn("support"), "logistics": None, "vibe": turn("propose")}
    p = participation(ALL, r2, {("logistics", 2): "gemini-3.5-flash timed out after 45s"})
    log = {a["agent"]: a for a in p["agents"]}
    assert log["logistics"]["round2"] == "timed_out" and log["logistics"]["round1"] == "responded" and not log["logistics"]["counted"]
    assert p["consensus"] == "majority" and p["responded"] == 2
    assert participation(ALL, ALL, {})["consensus"] == "unanimous"
    split = {"budget": turn("flag"), "logistics": turn("flag"), "vibe": turn("propose")}
    assert participation(ALL, split, {})["consensus"] == "split"
    v = validate_plan("trip", {"budget": "8000"}, synth(), ALL, r2, {("logistics", 2): "timed out"})
    assert v["status"] == "needs_review" and any("Logistics did not answer" in x["message"] for x in v["checks"])


def test_trip_length_from_dates_or_brief():
    assert trip_days({"dates": "Sat 17 – Sun 18 Oct 2026"}, "") == 2
    assert trip_days({"dates": "Fri 30 Oct – Sun 1 Nov 2026"}, "") == 3
    assert trip_days({"dates": "Sat 10 Oct 2026"}, "") == 1
    assert trip_days({}, "a 2-day weekend trip") == 2
    assert trip_days({}, "three nights in Goa") == 4
    assert trip_days({}, "dinner somewhere") is None


# ---------- the Bengaluru -> Kadapa -> Vizag -> Araku plan, as the Moderator wrote it ----------
KADAPA_TRIP = {
    "budget": "5000", "headcount": 1, "budget_basis": "total", "dates": "Fri 9 – Sun 11 Oct 2026", "travel": ["own_car", "bike", "bus_state"],
    "origin": {"lat": 12.97, "lon": 77.59, "label": "Munnenkolalu, Bengaluru"},
    "stops": [
        {"lat": 14.47, "lon": 78.82, "label": "Kadapa", "mode": "own_car", "km": 245, "hours": 4.5},
        {"lat": 17.69, "lon": 83.22, "label": "Visakhapatnam", "mode": "bus_state", "km": 715, "hours": 17},
        {"lat": 18.33, "lon": 82.88, "label": "Araku Valley", "mode": "bike", "km": 115, "hours": 3.7},
    ],
}
KADAPA_LEGS = [
    leg(1, "06:00", "Bengaluru", "Kadapa", "own_car", "own", 6.5, 1, "12:30"),
    # "Saturday: take the overnight bus... arrive early Saturday morning"
    leg(2, "00:30", "Kadapa", "Visakhapatnam", "bus_state", "public", 13, 2, "06:00"),
    # rides "your own bike" from Vizag although it never left Bengaluru, in 2 h up the ghats
    leg(2, "08:00", "Visakhapatnam", "Araku Valley", "bike", "own", 2, 2, "10:00"),
]
KADAPA_COSTS = [
    CostItem(item="Car fuel (Bengaluru → Kadapa)", amount=1870), CostItem(item="Car tolls (Bengaluru → Kadapa)", amount=200),
    CostItem(item="State-run bus fare (Kadapa → Visakhapatnam)", amount=700), CostItem(item="Bike fuel (Visakhapatnam → Araku)", amount=300),
    CostItem(item="Bike parking in Visakhapatnam", amount=100), CostItem(item="Accommodation in Kadapa (1 night)", amount=500),
    CostItem(item="Food (3 days)", amount=900),
]


def kadapa(**kw):
    split = {"budget": turn("flag"), "logistics": turn("flag"), "vibe": turn("flag")}
    return validate_plan("I'm going to kadapa from bangalore in car, stay one day, then vizag and araku.", KADAPA_TRIP,
                         synth(4570, KADAPA_COSTS, KADAPA_LEGS, 1, summary="Keeps total expenses around 4,570 INR for one traveller."), ALL, split)


def messages(v, area=None, level=None):
    return [c["message"] for c in v["checks"] if (area is None or c["area"] == area) and (level is None or c["level"] == level)]


def test_kadapa_plan_is_not_presented_as_verified():
    assert kadapa()["status"] == "not_verified"


def test_overnight_bus_cannot_arrive_the_same_morning():
    errs = messages(kadapa(), "timing", "error")
    assert any("Kadapa → Visakhapatnam" in m and "not day 2 around 06:00" in m for m in errs), errs


def test_understated_bus_time_is_corrected_from_the_route():
    warns = messages(kadapa(), "timing", "warn")
    assert any("Kadapa → Visakhapatnam by state bus is given as 13 h" in m and "17.0 h" in m for m in warns), warns
    errs = messages(kadapa(), "timing", "error")
    assert any("takes about 17.0 h, so it arrives day 2 around 17:30" in m for m in errs), errs


def test_ghat_leg_time_is_corrected():
    warns = messages(kadapa(), "timing", "warn")
    assert any("Visakhapatnam → Araku Valley" in m and "ghat" in m for m in warns), warns


def test_own_bike_cannot_appear_in_vizag_and_car_is_left_in_kadapa():
    errs = messages(kadapa(), "vehicles", "error")
    assert any("own bike" in m and "Rent one in Visakhapatnam" in m for m in errs), errs
    assert any("car is left in Kadapa" in m for m in errs), errs


def test_missing_return_journey_is_an_error():
    assert any("no way back" in m for m in messages(kadapa(), "itinerary", "error"))


def test_costs_are_checked_against_reference_prices_and_budget_is_not_claimed():
    v = kadapa()
    low = messages(v, "costs")
    assert any(m.startswith("Ticket costs at ₹700 look too low") for m in low), low
    assert any(m.startswith("Stay costs at ₹500 look too low") for m in low), low
    budget = messages(v, "budget")
    assert not any("is within the" in m for m in budget), budget
    assert any("over the ₹5,000 budget" in m for m in budget), budget
    assert v["realistic_minimum"] > 5000


def test_split_council_is_flagged():
    assert any("split" in m for m in messages(kadapa(), "council", "warn"))


def test_route_card_numbers_are_the_ones_checked():
    feas = messages(kadapa(), "feasibility")[0]
    assert "1,075 km" in feas and "route card" in feas, feas


def test_honest_overnight_bus_and_rented_bike_pass_those_checks():
    legs = [
        leg(1, "06:00", "Bengaluru", "Kadapa", "own_car", "own", 5, 1, "11:00"),
        leg(1, "19:00", "Kadapa", "Visakhapatnam", "bus_state", "public", 17, 2, "12:00"),
        leg(2, "13:00", "Visakhapatnam", "Araku Valley", "bike", "rental", 3.7, 2, "16:45"),
    ]
    v = validate_plan("one way trip to araku", KADAPA_TRIP, synth(4570, KADAPA_COSTS, legs, 1), ALL, ALL)
    assert not messages(v, "timing", "error") and not messages(v, "vehicles", "error")
    assert any("Rental costs are needed but not costed" in m for m in messages(v, "costs", "error"))


def test_headcount_mismatch_is_flagged():
    four = {**COORG_TRIP, "headcount": 4}
    assert any("costed for 3 people" in m for m in messages(validate_plan("trip", four, synth(7200, COORG_COSTS, COORG_LEGS, 3), ALL, ALL), "headcount", "error"))
    said = validate_plan("trip", four, synth(7200, COORG_COSTS, COORG_LEGS, None, summary="A budget weekend in Coorg for three friends."), ALL, ALL)
    assert any('"for three"' in m for m in messages(said, "headcount", "error"))
    fine = validate_plan("trip", four, synth(7200, COORG_COSTS, COORG_LEGS, None, summary="Two nights for 4 people."), ALL, ALL)
    assert not messages(fine, "headcount", "error")
