"""Checks a finished debate before it is presented as a decision.

Nothing here calls a model: it is plain arithmetic and geography over what the user asked for and what
the council produced, so a fabricated distance, an impossible route or a budget that does not add up
is caught the same way every time.

status: verified (no problems), needs_review (warnings), not_verified (errors).
"""
import math
import re
from datetime import date

from app.prices import DAILY, RATES, is_hill, leg_hours
from app.schemas import ModeratorSynthesis, SpecialistTurn

SPECIALISTS = ("budget", "logistics", "vibe")

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


# ---------- places, times and hops ----------

MODE_NAME = {"own_car": "car", "rental": "self-drive car", "bike": "bike", "cab": "cab", "bus_state": "state bus",
             "bus_private": "private bus", "train": "train", "flight": "flight", "walk": "walk"}

ALIASES = {"bangalore": "bengaluru", "vizag": "visakhapatnam", "vskp": "visakhapatnam", "bombay": "mumbai", "madras": "chennai",
           "mysore": "mysuru", "calcutta": "kolkata", "cochin": "kochi", "pondy": "pondicherry", "puducherry": "pondicherry",
           "kodagu": "coorg", "madikeri": "coorg", "araku valley": "araku", "trivandrum": "thiruvananthapuram"}


def _words(name: str | None) -> set[str]:
    text = (name or "").lower()
    for k, v in ALIASES.items():
        text = re.sub(rf"\b{re.escape(k)}\b", v, text)
    return {w for w in re.findall(r"[a-z]{4,}", text) if w not in {"valley", "city", "town", "station", "stand", "airport", "road", "bus"}}


def same_place(a: str | None, b: str | None) -> bool:
    """Loose match for place names written differently by the user, the map and the model."""
    return bool(_words(a) & _words(b))


def _clock(day: int, hhmm: str) -> float | None:
    m = re.match(r"^\s*(\d{1,2})[:.](\d{2})", hhmm or "")
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        return None
    return (day - 1) * 24 + int(m.group(1)) + int(m.group(2)) / 60


def _fmt(t: float) -> str:
    day, rem = int(t // 24) + 1, t % 24
    return f"day {day} around {int(rem):02d}:{int(round((rem % 1) * 60)) % 60:02d}"


def route_hops(c: dict) -> list[dict]:
    """Each hop of the planned route with road km and door-to-door hours.

    The planner sends the numbers on its route card (real road distances where available); without them the
    same leg-by-leg estimate is used, so the warning and the card can never disagree."""
    pts = _route_points(c)
    travel = set(c.get("travel") or [])
    hops = []
    for a, b in zip(pts, pts[1:]):
        straight = haversine_km(a, b)
        mode = b.get("mode") or ("flight" if "flight" in travel and straight > 700 else None)
        given = isinstance(b.get("km"), (int, float)) and isinstance(b.get("hours"), (int, float)) and b["km"] >= straight * 0.9
        km = float(b["km"]) if given else straight * (1 if mode == "flight" else ROAD_FACTOR)
        hours = float(b["hours"]) if given else leg_hours(km, mode, b.get("label"))
        hops.append({"from": a.get("label"), "to": b.get("label"), "mode": mode, "km": km, "hours": hours,
                     "straight": straight, "source": "route card" if given else "estimate"})
    return hops


ONE_WAY = re.compile(r"\bone[\s-]?way\b|\bno return\b|\bnot coming back\b|\bdrop (?:me|us)\b|\brelocat|\bmoving to\b", re.I)
NUM_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
             "eleven": 11, "twelve": 12, "a single": 1, "single": 1}
PEOPLE = re.compile(r"\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a single|single)\s+"
                    r"(people|persons|travell?ers|friends|adults|pax|guests)\b|\bfor\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b(?!\s*(?:days?|nights?|hours?|hrs?|km|rupees|inr|₹|am|pm|minutes?|mins?))", re.I)


def check_headcount(plan, c: dict, summary: str, add) -> None:
    group = int(c["headcount"]) if c.get("headcount") else None
    if not group:
        return
    if plan.headcount and plan.headcount != group:
        add("error", "headcount", f"The plan is costed for {plan.headcount} {'person' if plan.headcount == 1 else 'people'}, but the group is {group}.")
        return
    for m in PEOPLE.finditer(f"{summary} {plan.description} {plan.title}"):
        word = (m.group(1) or m.group(3)).lower()
        n = int(word) if word.isdigit() else NUM_WORDS.get(word)
        if n and n != group:
            add("error", "headcount", f'The plan says "{m.group(0).strip()}", but the group is {group}. Costs may be for the wrong number of people.')
            return
    if plan.headcount:
        add("ok", "headcount", f"Costed for the whole group of {group}.")


def check_itinerary(plan, c: dict, brief: str, hops: list[dict], days: int | None, add) -> dict:
    """Timings, the order of legs, where each vehicle is, and whether the trip gets home."""
    legs = plan.itinerary or []
    found = {"return_missing": False, "rental_days": set(), "legs": []}
    if not legs:
        add("warn", "itinerary", "No timed itinerary, so departure and arrival times and vehicles could not be checked.")
        return found
    origin = (c.get("origin") or {}).get("label") or c.get("location")
    vehicles: dict[str, str | None] = {}  # own vehicle -> where it is now
    prev_arrival = None
    for n, leg in enumerate(legs, 1):
        dep, arr = _clock(leg.day, leg.depart), _clock(leg.arrive_day, leg.arrive)
        name = f"{leg.from_place} → {leg.to_place}"
        hop = next((h for h in hops if same_place(h["to"], leg.to_place) and (not h["from"] or same_place(h["from"], leg.from_place) or True)), None)
        hours = leg.hours
        if hop and hop["mode"] in (None, leg.mode) and hours < hop["hours"] * 0.85:
            add("warn", "timing", f"{name} by {MODE_NAME[leg.mode]} is given as {leg.hours:g} h, but the route takes about {hop['hours']:.1f} h"
                f"{' on ghat roads with stops' if is_hill(leg.to_place) else ''} ({round(hop['km'])} km, {hop['source']}).")
            hours = hop["hours"]
        if dep is None or arr is None:
            add("warn", "timing", f"{name} has no clear departure or arrival time.")
        else:
            expected = dep + hours
            if arr < dep:
                add("error", "timing", f"{name} arrives before it departs.")
            elif arr < expected - max(1.0, hours * 0.15):
                add("error", "timing", f"{name} leaves {_fmt(dep)} and takes about {hours:.1f} h, so it arrives {_fmt(expected)}, not {_fmt(arr)}.")
            if prev_arrival is not None and dep < prev_arrival - 0.01:
                add("error", "timing", f"{name} departs {_fmt(dep)}, before the previous leg arrives ({_fmt(prev_arrival)}).")
            prev_arrival = max(arr, dep + hours)
        # Vehicles: an own car or bike is wherever the group last drove it, starting at home.
        if leg.vehicle == "own" and leg.mode in ("own_car", "bike"):
            at = vehicles.get(leg.mode, origin)
            if at and not same_place(at, leg.from_place):
                what = "car" if leg.mode == "own_car" else "bike"
                add("error", "vehicles", f"{name} uses your own {what}, but it is in {at}, not {leg.from_place}. Rent one in {leg.from_place} (and cost it) or plan how it gets there.")
            else:
                vehicles[leg.mode] = leg.to_place
        if leg.vehicle == "rental":
            found["rental_days"].add((leg.mode, leg.day))
        found["legs"].append({"leg": leg, "hop": hop})
    last = legs[-1]
    if days and prev_arrival is not None and prev_arrival > days * 24:
        add("error", "timing", f"The itinerary runs to {_fmt(prev_arrival)}, past the {days}-day trip.")
    one_way = bool(ONE_WAY.search(brief or ""))
    if origin and not one_way and not same_place(last.to_place, origin):
        found["return_missing"] = True
        add("error", "itinerary", f"The plan ends in {last.to_place} with no way back to {origin}. The return journey and its cost are missing.")
    if not one_way:
        for mode, at in vehicles.items():
            if origin and at and not same_place(at, origin):
                add("error", "vehicles", f"Your own {'car' if mode == 'own_car' else 'bike'} is left in {at} and never brought home.")
    return found


CATEGORY_WORDS = [("rental", r"rent|hire"), ("tolls", r"toll"), ("fuel", r"fuel|petrol|diesel|cng"),
                  ("fare", r"fare|ticket|bus|train|flight|cab|taxi|seat"), ("stay", r"stay|hotel|room|lodg|accommod|guest\s*house|hostel|homestay|resort|night"),
                  ("food", r"food|meal|breakfast|lunch|dinner|snack"), ("fees", r"entry|fee|ticket|park")]


def _category(item) -> str:
    if item.category:
        return item.category
    for cat, pat in CATEGORY_WORDS:
        if re.search(pat, item.item, re.I):
            return cat
    return "other"


def check_costs(plan, c: dict, hops: list[dict], days: int | None, it: dict, budget: dict | None, add) -> float | None:
    """Compare each kind of cost with the reference minimum for what the itinerary actually does.

    Returns the realistic minimum total (stated costs, raised to the reference minimum where they fall short),
    or None when there is not enough structure to work it out."""
    items = plan.cost_breakdown or []
    if not items:
        return None
    people = max(1, int(c.get("headcount") or plan.headcount or 1))
    stated: dict[str, float] = {}
    for i in items:
        stated[_category(i)] = stated.get(_category(i), 0) + i.amount
    need: dict[str, tuple[float, str]] = {}

    def want(cat: str, amount: float, why: str) -> None:
        old = need.get(cat, (0, ""))
        need[cat] = (old[0] + amount, f"{old[1]}; {why}" if old[1] else why)

    legs = it.get("legs") or [{"leg": None, "hop": h} for h in hops]
    for x in legs:
        leg, hop = x["leg"], x["hop"]
        if not hop:
            continue
        mode = leg.mode if leg else (hop["mode"] or "own_car")
        km = hop["km"]
        if mode in ("bus_state", "bus_private", "train"):
            r = RATES[mode]
            want("fare", km * r["low"] * people, f"{round(km)} km by {MODE_NAME[mode]} at ₹{r['low']}–{r['high']}/km per seat × {people}")
        elif mode in ("own_car", "rental"):
            want("fuel", km * RATES["own_car"]["low"], f"{round(km)} km by car at ₹{RATES['own_car']['low']}–{RATES['own_car']['high']}/km")
        elif mode == "bike":
            bikes = (people + 1) // 2
            want("fuel", km * RATES["bike"]["low"] * bikes, f"{round(km)} km by bike at ₹{RATES['bike']['low']}–{RATES['bike']['high']}/km")
        elif mode == "cab":
            want("fare", km * RATES["cab"]["low"], f"{round(km)} km by cab at ₹{RATES['cab']['low']}–{RATES['cab']['high']}/km")
    for mode, day in it.get("rental_days", set()):
        key = "bike_rental" if mode == "bike" else "car_rental"
        want("rental", DAILY[key]["low"] * ((people + 1) // 2 if mode == "bike" else 1), f"{key.replace('_', ' ')} from ₹{DAILY[key]['low']}/day")
    if days and days > 1:
        rooms = (people + 1) // 2
        want("stay", (days - 1) * rooms * DAILY["stay"]["low"], f"{days - 1} night(s) × {rooms} room(s) from ₹{DAILY['stay']['low']}")
    if days:
        want("food", days * people * DAILY["food"]["low"], f"{days} day(s) × {people} from ₹{DAILY['food']['low']} per person")

    labels = {"fare": "Ticket costs", "fuel": "Fuel costs", "rental": "Rental costs", "stay": "Stay costs", "food": "Food costs"}
    realistic = sum(v for k, v in stated.items() if k not in need)
    short = False
    for cat, (minimum, why) in need.items():
        got = stated.get(cat, 0)
        realistic += max(got, minimum)
        if got == 0 and cat in ("fare", "fuel", "rental", "stay"):
            short = True
            add("error", "costs", f"{labels[cat]} are needed but not costed (at least ₹{minimum:,.0f}: {why}).")
        elif got < minimum * 0.95:
            short = True
            add("warn", "costs", f"{labels[cat]} at ₹{got:,.0f} look too low; reference prices give at least ₹{minimum:,.0f} ({why}).")
    if it.get("return_missing"):
        back = sum(h["km"] for h in hops)
        realistic += back * RATES["bus_state"]["low"] * people
        short = True
    if budget and short:
        if realistic > budget["total"]:
            add("error", "budget", f"With every leg, night and the trip home costed at reference prices, this needs at least ₹{realistic:,.0f}, over the ₹{budget['total']:,.0f} budget.")
        else:
            add("warn", "budget", f"Still within budget at reference prices (at least ₹{realistic:,.0f} of ₹{budget['total']:,.0f}), but some costs above need correcting.")
    elif need and not short:
        add("ok", "costs", "Each kind of cost is at or above reference prices for this route.")
    return realistic


def validate_plan(brief: str, constraints: dict | None, synthesis: ModeratorSynthesis,
                  r1: dict[str, SpecialistTurn | None], r2: dict[str, SpecialistTurn | None],
                  errors: dict | None = None) -> dict:
    c = constraints or {}
    checks: list[dict] = []

    def add(level: str, area: str, message: str) -> None:
        checks.append({"level": level, "area": area, "message": message})

    plan = synthesis.final_plan
    days = trip_days(c, brief)

    # ---- geography and travel time, from the same numbers as the route card ----
    pts = _route_points(c)
    hops = route_hops(c)
    for h in hops:
        name = f"{h['from'] or 'start'} → {h['to'] or 'next stop'}"
        if h["straight"] > MAX_ANY_HOP_KM:
            add("error", "geography", f"{name} is about {round(h['straight']):,} km apart. One of these places is probably the wrong match; check the route.")
        elif h["mode"] not in ("flight", "train") and h["km"] > MAX_ROAD_HOP_KM:
            add("error", "geography", f"{name} is about {round(h['km']):,} km by road, which is not a realistic leg by {MODE_NAME.get(h['mode'], 'road')}.")
    if hops:
        km = sum(h["km"] for h in hops if h["mode"] != "flight")
        hours = sum(h["hours"] for h in hops)
        there_and_back = len(hops) == 1 and not ONE_WAY.search(brief or "")
        total_h = hours * (2 if there_and_back else 1)
        span = "there and back" if there_and_back else "one way, end to end"
        source = "route card" if all(h["source"] == "route card" for h in hops) else "estimate"
        msg = f"About {round(km):,} km by road and {total_h:.1f} h of travel {span} ({source})"
        if days and total_h > days * DRIVING_HOURS_PER_DAY:
            add("error" if total_h > days * DRIVING_HOURS_PER_DAY * 1.5 else "warn", "feasibility", f"{msg}, in a {days}-day trip.")
        else:
            add("ok", "feasibility", f"{msg}" + (f", which fits {days} days." if days else "."))

    # ---- itinerary, people, costs ----
    it = check_itinerary(plan, c, brief, hops, days, add)
    check_headcount(plan, c, synthesis.summary, add)
    budget = group_budget(c)
    cost = plan.estimated_cost
    if cost is None:
        add("warn", "budget", "The plan has no total cost, so it cannot be checked against the budget.")
    elif cost <= 0:
        add("error", "budget", "The plan's total cost is zero or negative.")
    items = plan.cost_breakdown or []
    if items and cost:
        total = sum(i.amount for i in items)
        if abs(total - cost) > max(100, cost * 0.05):
            add("error", "budget", f"The cost breakdown adds up to {total:,.0f}, but the plan says {cost:,.0f}.")
        else:
            add("ok", "budget", "Cost breakdown adds up to the total.")
    elif cost:
        add("warn", "costs", "There is no cost breakdown, so the total cannot be checked line by line.")
    realistic = check_costs(plan, c, hops, days, it, budget, add)
    if budget and cost:
        if cost > budget["total"] * 1.0001:
            add("error", "budget", f"Total of {cost:,.0f} is over the {budget['total']:,.0f} group budget by {cost - budget['total']:,.0f}.")
        elif not any(x["area"] in ("costs", "itinerary") and x["level"] in ("error", "warn") for x in checks):
            add("ok", "budget", f"Total of {cost:,.0f} is within the {budget['total']:,.0f} group budget ({cost / budget['people']:,.0f} per person).")
        else:
            add("warn", "budget", f"The stated {cost:,.0f} is under the {budget['total']:,.0f} budget on paper, but it cannot be called within budget until the costs above are complete.")

    # ---- missing information ----
    if not c.get("budget"):
        add("info", "missing", "No budget was given, so costs were not checked against one.")
    if not c.get("headcount"):
        add("info", "missing", "Group size was not given; per-person costs assume one person.")
    if not c.get("dates") and days is None:
        add("info", "missing", "No dates or trip length were given, so travel time was not checked.")
    if not pts and not c.get("location"):
        add("info", "missing", "No starting point was given, so the route was not checked.")

    # ---- the council itself ----
    part = participation(r1, r2, errors or {})
    missing = [a["agent"].capitalize() for a in part["agents"] if not a["counted"]]
    if missing:
        add("warn", "council", f"{' and '.join(missing)} did not answer in the final round, so the decision rests on {part['responded']} of 3 agents.")
    if part["consensus"] == "split":
        add("warn", "council", "The council was split: most agents pushed back in the final round, so this is the Moderator's call alone.")

    levels = {x["level"] for x in checks}
    status = "not_verified" if "error" in levels else "needs_review" if "warn" in levels else "verified"
    return {"status": status, "checks": checks, "participation": part, "budget": budget,
            "realistic_minimum": round(realistic) if realistic else None}
