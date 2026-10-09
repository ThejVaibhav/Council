"""Checks a finished debate before it is presented as a decision.

Nothing here calls a model: it is plain arithmetic and geography over what the user asked for and what
the council produced, so a fabricated distance, an impossible route or a budget that does not add up
is caught the same way every time.

status: verified (no problems), needs_review (warnings), not_verified (errors).
"""
import math
import re
from datetime import date

from app.schemas import ModeratorSynthesis, SpecialistTurn

SPECIALISTS = ("budget", "logistics", "vibe")

# Rough road speeds (km/h) used only for feasibility, never shown as a promise.
ROAD_KMH = {"bike": 40, "cab": 45, "own_car": 50, "rental": 50, "bus_state": 40, "bus_private": 45, "train": 55, "walk": 4.5}
ROAD_FACTOR = 1.3  # roads are longer than the straight line
MAX_ROAD_HOP_KM = 3000  # road km; longer than this without a flight or train is not a realistic single leg
MAX_ANY_HOP_KM = 4500  # longer than this inside one trip almost always means a mislocated place
DRIVING_HOURS_PER_DAY = 9


def haversine_km(a: dict, b: dict) -> float:
    r = math.radians
    dlat, dlon = r(b["lat"] - a["lat"]), r(b["lon"] - a["lon"])
    h = math.sin(dlat / 2) ** 2 + math.cos(r(a["lat"])) * math.cos(r(b["lat"])) * math.sin(dlon / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def parse_amount(text) -> float | None:
    if text is None:
        return None
    if isinstance(text, (int, float)):
        return float(text) if text > 0 else None
    raw = str(text).lower().replace(",", "")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(k|lakh|l)?\b", raw)
    if not m:
        return None
    n = float(m.group(1)) * {"k": 1000, "lakh": 100000, "l": 100000}.get(m.group(2) or "", 1)
    return n if n > 0 else None


def budget_basis(constraints: dict) -> str:
    """total or per_person: the explicit choice, else what the budget text says."""
    basis = constraints.get("budget_basis")
    if basis in ("total", "per_person"):
        return basis
    return "per_person" if re.search(r"per\s*(person|head)|\beach\b|/\s*person", str(constraints.get("budget", "")).lower()) else "total"


def group_budget(constraints: dict) -> dict | None:
    """{total, per_person, basis, people} in the brief's currency, or None without a usable budget."""
    amount = parse_amount(constraints.get("budget"))
    if not amount:
        return None
    people = int(constraints.get("headcount") or 1)
    basis = budget_basis(constraints)
    total = amount * people if basis == "per_person" else amount
    return {"total": round(total, 2), "per_person": round(total / people, 2), "basis": basis, "people": people}


WORD_NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7}
MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()


def trip_days(constraints: dict, brief: str) -> int | None:
    """How many days the trip spans, from the picked dates or the brief ("2-day", "3 nights", "weekend")."""
    dates = str(constraints.get("dates") or "").lower()
    # "Sat 17 – Sun 18 Oct 2026" or "Fri 31 Oct – Sun 2 Nov 2026" (the format of the date picker)
    m = re.search(r"(\d{1,2})\s*([a-z]{3})?\s*[–-]\s*[a-z]{3}\s+(\d{1,2})\s+([a-z]{3})\s+(\d{4})", dates)
    if m and (m.group(2) or m.group(4)) in MONTHS and m.group(4) in MONTHS:
        y2, m2 = int(m.group(5)), MONTHS.index(m.group(4)) + 1
        m1 = MONTHS.index(m.group(2)) + 1 if m.group(2) else m2
        y1 = y2 - 1 if m1 > m2 else y2
        try:
            span = (date(y2, m2, int(m.group(3))) - date(y1, m1, int(m.group(1)))).days + 1
        except ValueError:
            span = 0
        if 1 <= span <= 60:
            return span
    if re.search(r"\b\w{3}\s+\d{1,2}\s+[a-z]{3}\s+\d{4}$", dates.strip()) and "–" not in dates:
        return 1
    text = f"{dates} {brief}".lower()
    m = re.search(r"\b(\d+|one|two|three|four|five|six|seven)[\s-]*(day|days|night|nights)\b", text)
    if m:
        n = int(m.group(1)) if m.group(1).isdigit() else WORD_NUM[m.group(1)]
        return n + 1 if m.group(2).startswith("night") else n
    if "weekend" in text:
        return 2
    return None


def participation(r1: dict, r2: dict, errors: dict) -> dict:
    """Who answered each round, who timed out, and whether the outcome was unanimous or a majority."""
    agents = []
    for a in SPECIALISTS:
        rounds = {}
        for n, turns in ((1, r1), (2, r2)):
            if turns.get(a) is not None:
                rounds[n] = "responded"
            else:
                err = str(errors.get((a, n), ""))
                rounds[n] = "timed_out" if "timed out" in err.lower() or "timeout" in err.lower() else "failed"
        agents.append({"agent": a, "round1": rounds[1], "round2": rounds[2], "counted": rounds[2] == "responded"})
    final = [r2[a] for a in SPECIALISTS if r2.get(a) is not None]
    agreeing = [t for t in final if t.stance != "flag"]
    if len(final) == 3 and len(agreeing) == 3:
        kind = "unanimous"
    elif len(agreeing) >= 2:
        kind = "majority"
    else:
        kind = "split"
    return {"agents": agents, "responded": len(final), "agreeing": len(agreeing), "consensus": kind}


def _route_points(constraints: dict) -> list[dict]:
    pts = []
    if constraints.get("origin"):
        pts.append({**constraints["origin"], "mode": None})
    for st in constraints.get("stops") or []:
        pts.append(st)
    if not constraints.get("stops") and constraints.get("dest"):
        pts.append({**constraints["dest"], "mode": None})
    return [p for p in pts if isinstance(p.get("lat"), (int, float)) and isinstance(p.get("lon"), (int, float))]


def validate_plan(brief: str, constraints: dict | None, synthesis: ModeratorSynthesis,
                  r1: dict[str, SpecialistTurn | None], r2: dict[str, SpecialistTurn | None],
                  errors: dict | None = None) -> dict:
    c = constraints or {}
    checks: list[dict] = []

    def add(level: str, area: str, message: str) -> None:
        checks.append({"level": level, "area": area, "message": message})

    # ---- geography and travel feasibility ----
    pts = _route_points(c)
    travel = set(c.get("travel") or [])
    road_km = 0.0
    for a, b in zip(pts, pts[1:]):
        km = haversine_km(a, b)
        mode = b.get("mode")
        flying = mode == "flight" or (mode is None and "flight" in travel)
        name = f"{a.get('label') or 'start'} → {b.get('label') or 'next stop'}"
        if km > MAX_ANY_HOP_KM:
            add("error", "geography", f"{name} is about {round(km):,} km apart. One of these places is probably the wrong match; check the route.")
        elif km * ROAD_FACTOR > MAX_ROAD_HOP_KM and not flying and mode != "train":
            add("error", "geography", f"{name} is about {round(km * ROAD_FACTOR):,} km by road, which is not a realistic leg by {mode or 'road'}.")
        if not flying:
            road_km += km * ROAD_FACTOR
    if len(pts) >= 2:
        days = trip_days(c, brief)
        speed = min((ROAD_KMH.get(p.get("mode") or "own_car", 50) for p in pts[1:]), default=50)
        hours = road_km / speed if speed else 0
        # A single destination is usually there and back; a multi-stop route is checked one way.
        there_and_back = len(pts) == 2
        total_h = hours * (2 if there_and_back else 1)
        span = "there and back" if there_and_back else "end to end"
        if days and total_h > days * DRIVING_HOURS_PER_DAY:
            add("error" if total_h > days * DRIVING_HOURS_PER_DAY * 1.5 else "warn", "feasibility",
                f"About {round(road_km):,} km by road, roughly {round(total_h)} h of travel {span}, in a {days}-day trip.")
        else:
            add("ok", "feasibility", f"About {round(road_km):,} km by road ({round(total_h)} h {span})" + (f", which fits {days} days." if days else "."))

    # ---- budget arithmetic ----
    plan = synthesis.final_plan
    budget = group_budget(c)
    cost = plan.estimated_cost
    if cost is None:
        add("warn", "budget", "The plan has no total cost, so it cannot be checked against the budget.")
    elif cost <= 0:
        add("error", "budget", "The plan's total cost is zero or negative.")
    if budget and cost:
        if cost > budget["total"] * 1.0001:
            add("error", "budget", f"Total of {cost:,.0f} is over the {budget['total']:,.0f} group budget by {cost - budget['total']:,.0f}.")
        else:
            add("ok", "budget", f"Total of {cost:,.0f} is within the {budget['total']:,.0f} group budget ({cost / budget['people']:,.0f} per person).")
    items = plan.cost_breakdown or []
    if items and cost:
        total = sum(i.amount for i in items)
        if abs(total - cost) > max(100, cost * 0.05):
            add("error", "budget", f"The cost breakdown adds up to {total:,.0f}, but the plan says {cost:,.0f}.")
        else:
            add("ok", "budget", "Cost breakdown adds up to the total.")

    # ---- missing information ----
    if not c.get("budget"):
        add("info", "missing", "No budget was given, so costs were not checked against one.")
    if not c.get("headcount"):
        add("info", "missing", "Group size was not given; per-person costs assume one person.")
    if not c.get("dates") and trip_days(c, brief) is None:
        add("info", "missing", "No dates or trip length were given, so travel time was not checked.")
    if not pts and not c.get("location"):
        add("info", "missing", "No starting point was given, so the route was not checked.")

    # ---- the council itself ----
    part = participation(r1, r2, errors or {})
    missing = [a["agent"].capitalize() for a in part["agents"] if not a["counted"]]
    if missing:
        add("warn", "council", f"{' and '.join(missing)} did not answer in the final round, so the decision rests on {part['responded']} of 3 agents.")

    levels = {x["level"] for x in checks}
    status = "not_verified" if "error" in levels else "needs_review" if "warn" in levels else "verified"
    return {"status": status, "checks": checks, "participation": part, "budget": budget}
