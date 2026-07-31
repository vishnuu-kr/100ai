"""
FastAPI server — REST API + WebSocket live event stream.
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database as db
from event_bus import get_event_bus, Event
from key_manager import get_key_manager
from orchestrator import run_company, get_agent_statuses, get_current_run_id
from agent_registry import ALL_AGENTS, AGENTS_BY_DEPT, AGENT_BY_ID


# ─── App Lifecycle ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    await db.init_db()
    # Assign all keys on startup
    km = get_key_manager()
    for agent in ALL_AGENTS:
        km.assign_to_agent(agent.id, agent.key_index)
    print("[Server] 100 keys assigned to 100 agents.")
    yield


app = FastAPI(title="AI Company Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class RunRequest(BaseModel):
    goal: str


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/agents")
async def get_agents():
    """Return all 100 agents with their current status."""
    statuses = get_agent_statuses()
    km = get_key_manager()
    key_statuses = {s["index"]: s for s in km.all_statuses()}

    if not statuses:
        # No run yet — return base definitions
        agents = []
        for a in ALL_AGENTS:
            d = a.to_dict()
            ks = key_statuses.get(a.key_index, {})
            d["key_status"] = ks.get("status", "idle")
            agents.append(d)
        return {"agents": agents, "departments": list(AGENTS_BY_DEPT.keys())}

    for s in statuses:
        agent_def = AGENT_BY_ID.get(s["id"])
        if agent_def:
            ks = key_statuses.get(agent_def.key_index, {})
            s["key_status"] = ks.get("status", "idle")
            s["specialty"] = agent_def.specialty
    return {"agents": statuses, "departments": list(AGENTS_BY_DEPT.keys())}


@app.get("/api/agents/{agent_id}")
async def get_agent_detail(agent_id: int):
    """Return detailed info for a single agent."""
    agent_def = AGENT_BY_ID.get(agent_id)
    if not agent_def:
        raise HTTPException(status_code=404, detail="Agent not found")

    run_id = get_current_run_id()
    tasks = []
    if run_id:
        all_tasks = await db.get_agent_tasks(run_id)
        tasks = [t for t in all_tasks if t["agent_id"] == agent_id]

    statuses = get_agent_statuses()
    status = next((s for s in statuses if s["id"] == agent_id), agent_def.to_dict())

    return {
        "agent": status,
        "definition": agent_def.to_dict(),
        "tasks": tasks,
    }


@app.get("/api/keys")
async def get_keys():
    km = get_key_manager()
    return {"keys": km.all_statuses()}


@app.post("/api/reload-keys")
async def reload_keys():
    """Hot-reload the keys file without restarting the server."""
    km = get_key_manager()
    old_count = len(km.slots)
    km._load_keys()
    # Re-assign agents to slots
    for agent in ALL_AGENTS:
        km.assign_to_agent(agent.id, agent.key_index)
    new_count = len(km.slots)
    return {"message": f"Keys reloaded. {new_count} slots active (was {old_count}).", "count": new_count}


@app.post("/api/validate-keys")
async def validate_keys():
    """Run a health check on all 100 keys and return which are working."""
    km = get_key_manager()
    results = await km.validate_all()
    return {"working": results["working"], "failed": results["failed"], "total": len(km.slots)}


@app.get("/api/runs")
async def list_runs():
    runs = await db.get_all_runs()
    return {"runs": runs}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    run = await db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    tasks = await db.get_agent_tasks(run_id)
    events = await db.get_events(run_id, limit=50)
    return {"run": run, "tasks": tasks, "events": events}


@app.post("/api/run")
async def start_run(req: RunRequest, background_tasks: BackgroundTasks):
    """Start a new company run. All 100 agents work concurrently."""
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")

    background_tasks.add_task(run_company, req.goal.strip())
    return {"message": "Run started", "goal": req.goal}


@app.get("/api/status")
async def status():
    return {
        "agents": len(ALL_AGENTS),
        "current_run": get_current_run_id(),
        "agent_statuses": {
            s["status"]: sum(1 for a in get_agent_statuses() if a.get("status") == s["status"])
            for s in [{"status": "idle"}, {"status": "working"}, {"status": "done"}, {"status": "error"}]
        } if get_agent_statuses() else {}
    }


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    bus = get_event_bus()
    queue = bus.subscribe()

    # Send recent history to newly connected client
    history = bus.get_history(limit=50)
    for event in history:
        try:
            await ws.send_text(event.to_json())
        except Exception:
            break

    try:
        while True:
            try:
                event: Event = await asyncio.wait_for(queue.get(), timeout=30)
                await ws.send_text(event.to_json())
            except asyncio.TimeoutError:
                # Send ping to keep alive
                await ws.send_text(json.dumps({"type": "ping"}))
    except (WebSocketDisconnect, Exception):
        bus.unsubscribe(queue)
