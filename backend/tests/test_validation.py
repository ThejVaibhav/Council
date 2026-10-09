"""Post-debate checks: geography, travel time, budget arithmetic, missing information and agent timeouts."""
from app.schemas import CostItem, FinalPlan, ModeratorSynthesis, SpecialistTurn
from app.validation import group_budget, participation, trip_days, validate_plan

BLR = {"lat": 12.97, "lon": 77.59, "label": "Bengaluru"}
COORG = {"lat": 12.42, "lon": 75.74, "label": "Coorg"}
BURKINA = {"lat": 12.37, "lon": -1.52, "label": "Waterfalls, Burkina Faso"}
KODAI = {"lat": 10.24, "lon": 77.49, "label": "Kodaikanal"}
DELHI = {"lat": 28.61, "lon": 77.21, "label": "Delhi"}
LEH = {"lat": 34.15, "lon": 77.58, "label": "Leh"}


def turn(stance="propose", cost=7000):
    return SpecialistTurn(option_title="x", description="d", estimated_cost=cost, stance=stance, commentary="c")


def synth(cost=7500, breakdown=None):
    return ModeratorSynthesis(final_plan=FinalPlan(title="t", description="d", estimated_cost=cost, cost_breakdown=breakdown), trade_off_log=[], summary="s")


ALL = {a: turn() for a in ("budget", "logistics", "vibe")}


def levels(v, area):
    return [c["level"] for c in v["checks"] if c["area"] == area]


def test_clean_weekend_trip_is_verified():
    c = {"budget": "8000", "headcount": 3, "dates": "Sat 10 – Sun 11 Oct 2026", "origin": BLR, "dest": COORG, "travel": ["own_car"]}
    breakdown = [CostItem(item="fuel", amount=2500), CostItem(item="stay", amount=3000), CostItem(item="food", amount=2000)]
    v = validate_plan("weekend in Coorg", c, synth(7500, breakdown), ALL, ALL)
    assert v["status"] == "verified", v["checks"]


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
