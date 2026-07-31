"""
SQLite database — stores runs, agent tasks, and events for history/replay.
"""

import asyncio
import json
import time
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).parent.parent / "company.db"


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
        CREATE TABLE IF NOT EXISTS runs (
            id          TEXT PRIMARY KEY,
            goal        TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'running',
            phase       INTEGER NOT NULL DEFAULT 0,
            started_at  REAL NOT NULL,
            finished_at REAL,
            final_output TEXT
        );

        CREATE TABLE IF NOT EXISTS agent_tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id      TEXT NOT NULL,
            agent_id    INTEGER NOT NULL,
            agent_name  TEXT NOT NULL,
            department  TEXT NOT NULL,
            role        TEXT NOT NULL,
            task_prompt TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'idle',
            output      TEXT,
            error       TEXT,
            started_at  REAL,
            finished_at REAL,
            FOREIGN KEY (run_id) REFERENCES runs(id)
        );

        CREATE TABLE IF NOT EXISTS events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id      TEXT NOT NULL,
            type        TEXT NOT NULL,
            agent_id    INTEGER,
            payload     TEXT NOT NULL,
            ts          REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_run ON agent_tasks(run_id);
        """)
        await db.commit()


async def save_run(run_id: str, goal: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO runs (id, goal, status, phase, started_at) VALUES (?,?,?,?,?)",
            (run_id, goal, "running", 0, time.time())
        )
        await db.commit()


async def update_run(run_id: str, **kwargs):
    if not kwargs:
        return
    cols = ", ".join(f"{k}=?" for k in kwargs)
    vals = list(kwargs.values()) + [run_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE runs SET {cols} WHERE id=?", vals)
        await db.commit()


async def save_agent_task(run_id: str, agent_id: int, agent_name: str,
                           department: str, role: str, task_prompt: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO agent_tasks
               (run_id, agent_id, agent_name, department, role, task_prompt, status)
               VALUES (?,?,?,?,?,?,?)""",
            (run_id, agent_id, agent_name, department, role, task_prompt, "idle")
        )
        await db.commit()
        return cur.lastrowid


async def update_agent_task(task_id: int, **kwargs):
    if not kwargs:
        return
    cols = ", ".join(f"{k}=?" for k in kwargs)
    vals = list(kwargs.values()) + [task_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE agent_tasks SET {cols} WHERE id=?", vals)
        await db.commit()


async def save_event(run_id: str, event_type: str, payload: dict, agent_id: int = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO events (run_id, type, agent_id, payload, ts) VALUES (?,?,?,?,?)",
            (run_id, event_type, agent_id, json.dumps(payload), time.time())
        )
        await db.commit()


async def get_run(run_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM runs WHERE id=?", (run_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def get_all_runs() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT 20") as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def get_agent_tasks(run_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM agent_tasks WHERE run_id=? ORDER BY agent_id", (run_id,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def get_events(run_id: str, limit: int = 200) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM events WHERE run_id=? ORDER BY ts DESC LIMIT ?",
            (run_id, limit)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
