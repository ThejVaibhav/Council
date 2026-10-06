"""Ways of getting there that a group can say it is open to."""
TRAVEL_MODES = {
    "own_car": "own car",
    "rental": "self-drive rental car",
    "bike": "motorbike",
    "cab": "cab or taxi",
    "bus_state": "state-run bus",
    "bus_private": "private or sleeper bus",
    "train": "train",
    "flight": "flight",
    "walk": "on foot or local transport only",
}


def describe(modes: list[str] | None) -> str | None:
    names = [TRAVEL_MODES[m] for m in modes or [] if m in TRAVEL_MODES]
    return ", ".join(names) if names else None
