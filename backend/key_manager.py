"""
Key Manager — 100 keys, 1 per agent, permanent mapping.
Each agent always uses the same key. If a key gets rate-limited,
it backs off and retries automatically.
"""

import asyncio
import time
import httpx
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class KeyStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"
    RATE_LIMITED = "rate_limited"
    EXPIRED = "expired"
    ERROR = "error"


@dataclass
class KeySlot:
    index: int            # 0-based
    key: str
    agent_id: Optional[int] = None
    status: KeyStatus = KeyStatus.IDLE
    cooldown_until: float = 0.0
    error_count: int = 0
    total_requests: int = 0
    last_used: float = 0.0

    def is_available(self) -> bool:
        if self.status == KeyStatus.RATE_LIMITED:
            if time.time() >= self.cooldown_until:
                self.status = KeyStatus.IDLE
                return True
            return False
        if self.status == KeyStatus.EXPIRED:
            if time.time() >= self.cooldown_until:
                self.status = KeyStatus.IDLE
                return True
            return False
        return self.status in (KeyStatus.IDLE, KeyStatus.BUSY)

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "agent_id": self.agent_id,
            "status": self.status.value,
            "error_count": self.error_count,
            "total_requests": self.total_requests,
            "last_used": self.last_used,
            "cooldown_until": self.cooldown_until,
        }


class KeyManager:
    BASE_URL = "https://api.tokenrouter.com/v1"
    MODEL = "moonshotai/kimi-k3-free"  # Keep in sync with orchestrator.py MODEL constant

    def __init__(self, keys_file: str):
        self.keys_file = keys_file
        self.slots: list[KeySlot] = []
        self._lock = asyncio.Lock()
        self._load_keys()

    def _load_keys(self):
        path = Path(self.keys_file)
        content = path.read_text(encoding="utf-8").strip()
        keys = [k.strip() for k in content.split(",") if k.strip()]
        self.slots = [KeySlot(index=i, key=k) for i, k in enumerate(keys)]
        print(f"[KeyManager] Loaded {len(self.slots)} keys")

    def assign_to_agent(self, agent_id: int, key_index: int):
        """Permanently assign key[key_index] to agent_id."""
        if key_index < len(self.slots):
            self.slots[key_index].agent_id = agent_id

    def get_key_for_agent(self, agent_id: int) -> Optional[str]:
        """Return the API key assigned to this agent."""
        for slot in self.slots:
            if slot.agent_id == agent_id:
                return slot.key
        return None

    def get_slot_for_agent(self, agent_id: int) -> Optional[KeySlot]:
        for slot in self.slots:
            if slot.agent_id == agent_id:
                return slot
        return None

    def mark_busy(self, agent_id: int):
        slot = self.get_slot_for_agent(agent_id)
        if slot:
            slot.status = KeyStatus.BUSY
            slot.last_used = time.time()
            slot.total_requests += 1

    def mark_idle(self, agent_id: int):
        slot = self.get_slot_for_agent(agent_id)
        if slot:
            slot.status = KeyStatus.IDLE

    def mark_rate_limited(self, agent_id: int, retry_after: int = 60):
        slot = self.get_slot_for_agent(agent_id)
        if slot:
            slot.status = KeyStatus.RATE_LIMITED
            slot.cooldown_until = time.time() + retry_after
            slot.error_count += 1

    def mark_expired(self, agent_id: int, retry_after: int = 90):
        slot = self.get_slot_for_agent(agent_id)
        if slot:
            slot.status = KeyStatus.EXPIRED
            slot.cooldown_until = time.time() + retry_after
            slot.error_count += 1

    def mark_error(self, agent_id: int):
        slot = self.get_slot_for_agent(agent_id)
        if slot:
            slot.status = KeyStatus.ERROR
            slot.error_count += 1

    def all_statuses(self) -> list[dict]:
        return [s.to_dict() for s in self.slots]

    async def validate_all(self) -> dict:
        """Quick health check — test each key against /v1/models."""
        print("[KeyManager] Running startup validation...")
        results = {"working": 0, "failed": 0}
        async with httpx.AsyncClient(timeout=15) as client:
            tasks = [self._check_key(client, slot) for slot in self.slots]
            outcomes = await asyncio.gather(*tasks, return_exceptions=True)
        for slot, ok in zip(self.slots, outcomes):
            if ok is True:
                results["working"] += 1
            else:
                slot.status = KeyStatus.ERROR
                results["failed"] += 1
        print(f"[KeyManager] Validation: {results['working']} working, {results['failed']} failed")
        return results

    async def _check_key(self, client: httpx.AsyncClient, slot: KeySlot) -> bool:
        try:
            r = await client.get(
                f"{self.BASE_URL}/models",
                headers={"Authorization": f"Bearer {slot.key}"},
            )
            if r.status_code == 200:
                data = r.json()
                ids = [m.get("id") for m in data.get("data", [])]
                return self.MODEL in ids
            return False
        except Exception:
            return False


# Singleton
_manager: Optional[KeyManager] = None


def get_key_manager() -> KeyManager:
    global _manager
    if _manager is None:
        import os
        keys_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "minikeyyyyyyyyyyyyyyy.txt"
        )
        _manager = KeyManager(keys_path)
    return _manager
