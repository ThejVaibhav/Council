"""Caps how many debates run at once so a public demo stays inside the free-tier quota."""
from fastapi import HTTPException

from app.config import get_settings

_active = 0


def claim() -> None:
    global _active
    if _active >= get_settings().max_concurrent_debates:
        raise HTTPException(429, "The council is busy with other debates right now, try again in a minute.")
    _active += 1


def release() -> None:
    global _active
    _active = max(0, _active - 1)


def active() -> int:
    return _active
