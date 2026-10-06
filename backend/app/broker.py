"""In-process fan-out of live debate events to everyone watching a plan.

Events are also stored in session_events, so a viewer who connects late replays
from the table and then follows the broker. One backend process is assumed (v1).
"""
import asyncio
from collections import defaultdict
from uuid import UUID

_subscribers: dict[UUID, set[asyncio.Queue]] = defaultdict(set)


def subscribe(session_id: UUID) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[session_id].add(q)
    return q


def unsubscribe(session_id: UUID, q: asyncio.Queue) -> None:
    subs = _subscribers.get(session_id)
    if subs is not None:
        subs.discard(q)
        if not subs:
            _subscribers.pop(session_id, None)


def publish(session_id: UUID, event: dict) -> None:
    for q in list(_subscribers.get(session_id, ())):
        q.put_nowait(event)
