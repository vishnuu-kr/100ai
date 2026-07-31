"""
Typed event bus — async pub/sub for all agent and system events.
FastAPI WebSocket clients subscribe here.
"""

import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine
import json


class EventType(str, Enum):
    # Run lifecycle
    RUN_STARTED      = "run_started"
    RUN_COMPLETE     = "run_complete"
    RUN_FAILED       = "run_failed"
    PHASE_CHANGED    = "phase_changed"

    # Agent lifecycle
    AGENT_ASSIGNED   = "agent_assigned"
    AGENT_THINKING   = "agent_thinking"
    AGENT_DONE       = "agent_done"
    AGENT_ERROR      = "agent_error"
    AGENT_RETRYING   = "agent_retrying"

    # Agent work
    TOOL_CALLED      = "tool_called"
    TOOL_RESULT      = "tool_result"
    MESSAGE_SENT     = "message_sent"

    # Key events
    KEY_BUSY         = "key_busy"
    KEY_IDLE         = "key_idle"
    KEY_RATE_LIMITED = "key_rate_limited"
    KEY_EXPIRED      = "key_expired"


@dataclass
class Event:
    type: EventType
    payload: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    run_id: str = ""

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "run_id": self.run_id,
        })


Subscriber = Callable[[Event], Coroutine]


class EventBus:
    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []
        self._history: list[Event] = []
        self._max_history = 500

    def subscribe(self) -> asyncio.Queue:
        """Create a new subscription queue."""
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def emit(self, event: Event):
        """Broadcast event to all subscribers."""
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.unsubscribe(q)

    def get_history(self, run_id: str = "", limit: int = 100) -> list[Event]:
        events = self._history
        if run_id:
            events = [e for e in events if e.run_id == run_id]
        return events[-limit:]


# Singleton
_bus = EventBus()


def get_event_bus() -> EventBus:
    return _bus
