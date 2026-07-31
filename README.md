# 🏢 AI Company Dashboard

> **100 specialist AI agents work concurrently on any goal you give them. Watch every single one in real-time.**

---

## Quick Start

Double-click `start.bat` (Windows) — it starts everything and opens your browser.

**Or manually:**

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend  
cd frontend
npm install
npm run dev
```

Then open: **http://localhost:3000**

---

## How It Works

1. **Type a goal** in the dashboard (e.g. *"Build a go-to-market plan for an AI writing tool"*)
2. **Click "Run Company"** — all 100 agents instantly get a specialized task
3. **Watch the dashboard** — every agent lights up, working concurrently
4. **Click any agent** — see their full task, thinking, and output
5. **Get the result** — the CEO synthesizes everything into a final report

---

## The 100-Agent Company

| Department | Count | Role |
|---|---|---|
| C-Suite (CEO, COO, CTO, CFO, CMO) | 5 | Strategy & synthesis |
| Research | 13 | Market analysis, competitive intel, user research |
| Engineering | 13 | Backend, frontend, DB, DevOps, security, ML |
| Marketing | 13 | Brand, content, social, SEO, PR, growth |
| QA | 10 | Test strategy, automation, performance, security |
| Data & Analytics | 12 | Data architecture, BI, ML, financial modeling |
| Strategy | 12 | Corporate strategy, business model, risk, M&A |
| Operations | 15 | Project management, HR, legal, ops, finance |

Each agent has a **permanent specialty** — they always apply their expertise to your goal.

---

## API Keys

Keys are loaded from `minikeyyyyyyyyyyyyyyy.txt` (100 keys).
Each agent gets exactly one key. The system handles rate limits automatically.

---

## Tech Stack

- **Backend:** Python + FastAPI + asyncio
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Database:** SQLite (runs with zero setup)
- **Live updates:** WebSocket
- **LLM:** `z-ai/glm-5.2-free` via `api.tokenrouter.com`
