"""Reference prices and travel speeds for India, used to sanity-check plans and to brief the agents.

These are planning assumptions, not live quotes: each rate says what it is based on, and the checks
only use them to flag numbers that are clearly too low or travel times that cannot be right.
Update them here when prices move; nothing else hard-codes a price.
"""

# Per-km fares and running costs in INR. low/high bracket a normal range; the checks use low as "at least".
RATES = {
    "bus_state": {"low": 1.1, "high": 1.6, "unit": "per seat-km",
                  "basis": "state transport (APSRTC/TSRTC/KSRTC) express and Super Luxury fares, roughly ₹1.1–1.6 per km"},
    "bus_private": {"low": 1.6, "high": 2.8, "unit": "per seat-km",
                    "basis": "private AC sleeper fares on booking apps, roughly ₹1.6–2.8 per km"},
    "train": {"low": 0.45, "high": 1.6, "unit": "per seat-km",
              "basis": "Indian Railways sleeper (~₹0.45/km) to 3AC (~₹1.5/km) base fares"},
    "own_car": {"low": 6.0, "high": 8.5, "unit": "per vehicle-km",
                "basis": "petrol at about ₹102–105 per litre and 12–17 km per litre"},
    "rental": {"low": 6.0, "high": 8.5, "unit": "per vehicle-km fuel",
               "basis": "fuel as for a car; the rental itself is charged per day"},
    "bike": {"low": 2.2, "high": 3.5, "unit": "per vehicle-km",
             "basis": "petrol at about ₹102–105 per litre and 30–45 km per litre"},
    "cab": {"low": 14.0, "high": 22.0, "unit": "per vehicle-km",
            "basis": "outstation cab rates, roughly ₹14–22 per km including the driver"},
    "toll": {"low": 1.2, "high": 2.4, "unit": "per car-km on national highways",
             "basis": "NHAI plaza rates, roughly one plaza every 60 km at ₹80–150 each"},
}
DAILY = {
    "bike_rental": {"low": 500, "basis": "scooter or motorbike rental, about ₹500–1,200 per day plus deposit"},
    "car_rental": {"low": 1800, "basis": "self-drive hatchback, about ₹1,800–3,500 per day before fuel"},
    "stay": {"low": 700, "basis": "budget lodge or guesthouse room, about ₹700–1,500 per night"},
    "food": {"low": 300, "basis": "simple meals, about ₹300–600 per person per day"},
}

# Average moving speeds (km/h) and the slow-down on ghat roads.
SPEED_KMH = {"bike": 40, "cab": 45, "own_car": 55, "rental": 55, "bus_state": 42, "bus_private": 48, "train": 55, "walk": 4.5, "flight": 650}
GHAT_FACTOR = 0.65  # ghat sections run at roughly two thirds of normal speed
GHAT_KM = 40  # the climb into a hill destination is usually the last 30-50 km
BREAK_EVERY_H, BREAK_MIN = 2.0, 15  # a short stop every two hours on the road

# Hill destinations reached by ghat roads (matched by name).
HILL_PLACES = (
    "araku", "lambasingi", "ooty", "kodaikanal", "munnar", "coorg", "kodagu", "madikeri", "chikmagalur", "sakleshpur",
    "agumbe", "wayanad", "yercaud", "nandi hills", "kudremukh", "horsley hills", "manali", "shimla", "mussoorie",
    "nainital", "darjeeling", "gangtok", "leh", "kasol", "dharamshala", "mcleodganj", "lonavala", "mahabaleshwar",
    "matheran", "thekkady", "valparai", "kemmangundi", "gulmarg", "srisailam",
)


def is_hill(label: str | None) -> bool:
    name = (label or "").lower()
    return any(h in name for h in HILL_PLACES)


def leg_hours(km: float, mode: str | None, to_label: str | None = None) -> float:
    """Door-to-door hours for one leg: moving time, slower on ghat roads, plus short breaks on long drives."""
    mode = mode or "own_car"
    speed = SPEED_KMH.get(mode, 50)
    if mode == "flight":
        return km / speed + 2.5  # check-in, security and getting to and from the airport
    ghat = min(km, GHAT_KM) if is_hill(to_label) else 0
    hours = (km - ghat) / speed + ghat / (speed * GHAT_FACTOR)
    if mode in ("own_car", "rental", "bike", "cab"):
        hours += int(hours // BREAK_EVERY_H) * BREAK_MIN / 60
    return hours


def brief_notes() -> str:
    """The rates in a form the agents can use, so their numbers start from the same assumptions."""
    lines = [f"- {m.replace('_', ' ')}: ₹{r['low']}–{r['high']} {r['unit']} ({r['basis']})" for m, r in RATES.items()]
    lines += [f"- {k.replace('_', ' ')}: from ₹{v['low']} ({v['basis']})" for k, v in DAILY.items()]
    return "Reference prices (planning assumptions, not live quotes):\n" + "\n".join(lines)
