"""
Orchestrator — the brain of the 100-agent Chief Marketing Intelligence System.

SEQUENTIAL CHAIN PIPELINE:
  PHASE 0: Scrape Target Website (extracts product, value props, features)
       ↓ site profile injected into all agents
  PHASE 1: Team A — Trend Discovery (finds live trending topics for this product category)
       ↓ trend report injected into Team B
  PHASE 2: Team B — Competitor Intelligence (finds who ranks for those trends)
       ↓ competitor report injected into Team C
  PHASE 3: Team C — Audience Research (maps who the users ARE using trends + competitor data)
       ↓ audience report injected into Team D
  PHASE 4: Team D — Content Engine (creates ALL content using trends + gaps + audience language)
       ↓ content output injected into Teams E, F
  PHASE 5: Team E — SEO (keyword briefs based on trends + content)
       Team F — Analytics (scores and predicts traffic/signup from content)
       ↓ all reports injected into Team G
  PHASE 6: Team G — Strategy (final ranked ROI action plan)
       ↓
  PHASE 7: Chief Marketing Intelligence Officer Master Report (synthesizes everything)

Each phase's output feeds directly into the next — this is not random parallel work,
it is a true intelligence chain designed to maximize website visits, signups, and conversions.
"""

import asyncio
import json
import time
import uuid
import httpx
import random
import logging

from agent_registry import ALL_AGENTS, AgentDef
from event_bus import EventBus, Event, EventType, get_event_bus
from key_manager import KeyManager, get_key_manager
import database as db
import web_scraper

logger = logging.getLogger("orchestrator")

BASE_URL = "https://api.tokenrouter.com/v1"
MODEL = "moonshotai/kimi-k3-free"  # Kimi K3 — powerful reasoning model
MAX_GOAL_LENGTH = 6000
CONCURRENCY = 8  # Balanced concurrency (8 agents parallel) prevents API timeouts

# In-memory agent status for the current run
_agent_status: dict[int, dict] = {}
_current_run_id: str = ""


def get_agent_statuses() -> list[dict]:
    return list(_agent_status.values())


def get_current_run_id() -> str:
    return _current_run_id


async def _call_llm(key: str, system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> str:
    """Single LLM call using Kimi K3 — a powerful reasoning model. Extracts both content and reasoning."""
    async with httpx.AsyncClient(timeout=240) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.6,  # Lower temp = more focused analytical output from reasoning model
            }
        )
        resp.raise_for_status()
        
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise ValueError(f"No choices in LLM response: {data}")
            
        msg = choices[0].get("message", {})
        content = msg.get("content")
        reasoning = msg.get("reasoning_content")
        
        # Kimi K3 returns reasoning_content during thinking; use content as primary output
        # Combine both if available for maximum intelligence extraction
        if content and reasoning:
            final_text = content  # content is the final answer after thinking
        elif content:
            final_text = content
        elif reasoning:
            final_text = reasoning
        else:
            final_text = None
        
        if not final_text:
            raise ValueError(f"LLM returned empty content. Full response: {data}")
            
        return str(final_text)


async def _run_agent(
    agent: AgentDef,
    task: str,
    run_id: str,
    task_db_id: int,
    bus: EventBus,
    km: KeyManager,
    semaphore: asyncio.Semaphore,
    use_live_web: bool = True,
    chain_context: str = "",
) -> dict:
    """
    Run a single agent.
    chain_context = the output of the previous team, passed as additional grounding intelligence.
    use_live_web = whether to fetch live search/social data before calling LLM.
    """
    agent_id = agent.id
    key = km.get_key_for_agent(agent_id)

    _agent_status[agent_id]["status"] = "working"
    _agent_status[agent_id]["current_task"] = task[:120]
    _agent_status[agent_id]["started_at"] = time.time()
    km.mark_busy(agent_id)
    await db.update_agent_task(task_db_id, status="working", started_at=time.time())

    await bus.emit(Event(
        type=EventType.AGENT_ASSIGNED, run_id=run_id,
        payload={"agent_id": agent_id, "agent_name": agent.name, "role": agent.role,
                 "department": agent.department, "task": task[:200], "key_index": agent.key_index}
    ))
    await bus.emit(Event(
        type=EventType.KEY_BUSY, run_id=run_id,
        payload={"key_index": agent.key_index, "agent_id": agent_id}
    ))

    # Minimal stagger — just enough to avoid thundering herd on startup
    await asyncio.sleep((agent_id % 8) * 0.08)

    # ── Web scraping runs OUTSIDE semaphore so it never blocks LLM slots ──────
    live_web_context = ""
    if use_live_web and agent_id > 1:
        try:
            await bus.emit(Event(
                type=EventType.AGENT_THINKING, run_id=run_id,
                payload={"agent_id": agent_id, "agent_name": agent.name,
                         "thought": f"🌐 Browsing Reddit, HN, web ({agent.department})..."}
            ))
            live_web_context = await web_scraper.gather_live_intelligence(task[:150], agent.department)
        except Exception as e:
            logger.warning(f"Web scraper warning for agent {agent_id}: {e}")

    async with semaphore:
        await asyncio.sleep(random.uniform(0.05, 0.3))

        # Build the full prompt — chain context increased to 4000 chars per agent
        full_prompt_parts = [task]
        if chain_context:
            full_prompt_parts.append(
                f"\n\n---\n### INTELLIGENCE FROM PREVIOUS TEAMS (BUILD ON THIS):\n{chain_context[:4000]}\n---"
            )
        if live_web_context:
            full_prompt_parts.append(live_web_context)
        full_task_prompt = "\n".join(full_prompt_parts)

        if agent.id == 1:
            system_prompt = (
                "You are Alexandra Chen, Chief Marketing Intelligence Officer leading 100 AI agents. "
                "Synthesize the 7 sequential team reports into the definitive Master Executive Marketing Intelligence Report. "
                "The research flows: Site Profile → Trends → Competitors → Audience → Content → SEO/Analytics → Strategy. "
                "Your PRIMARY GOAL is to get the most users possible, with a heavy focus on REDDIT — it drives the most users. "
                "Tell the user exactly WHAT to post, on WHICH subreddits and platforms, and WHEN. "
                "Include: Executive Summary, Top 5 Opportunities ranked by Impact (1-10) & Confidence (1-10), "
                "the single highest ROI action today, a 7-day Reddit-first content calendar with specific post titles, "
                "and step-by-step instructions to get the first 1,000 users. "
                "Cite sources, flag uncertainty, deduplicate overlapping insights."
            )
        else:
            system_prompt = (
                f"You are {agent.name}, {agent.role} in {agent.department}. "
                f"Your unique specialty: {agent.specialty}.\n\n"
                "You are part of a 100-agent sequential intelligence chain powered by Kimi K3 reasoning. "
                "THINK DEEPLY and use your full reasoning capability before writing. "
                "The previous team's findings are your foundation — build ON TOP of them, do not repeat. "
                "Be highly specific: cite real URLs, real subreddit names, real post titles, real numbers. "
                "Use headers, bullet points, and tables. "
                "Your output feeds the next specialist team AND the final synthesis — make it DENSE and ACTIONABLE. "
                "Focus exclusively on your specialty: {agent.specialty}"
            ).replace("{agent.specialty}", agent.specialty)

        max_retries = 3
        retry_delays = [15, 30, 45]
        output = None
        error = None

        for attempt in range(max_retries):
            try:
                await bus.emit(Event(
                    type=EventType.AGENT_THINKING, run_id=run_id,
                    payload={"agent_id": agent_id, "agent_name": agent.name,
                             "thought": f"Applying {agent.specialty[:60]}..."}
                ))
                output = await _call_llm(
                    key, system_prompt, full_task_prompt,
                    max_tokens=4000 if agent.id == 1 else 2500
                )
                break

            except httpx.HTTPStatusError as e:
                code = e.response.status_code
                if code in (429, 503):
                    reason = "rate_limited" if code == 429 else "service_unavailable"
                    if code == 429:
                        km.mark_rate_limited(agent_id, retry_after=retry_delays[attempt])
                    if attempt < max_retries - 1:
                        await bus.emit(Event(
                            type=EventType.AGENT_RETRYING, run_id=run_id,
                            payload={"agent_id": agent_id, "attempt": attempt + 1, "reason": reason}
                        ))
                        await asyncio.sleep(retry_delays[attempt])
                        km.mark_busy(agent_id)
                    else:
                        error = f"HTTP {code} after {max_retries} attempts"
                elif code == 401:
                    km.mark_expired(agent_id)
                    error = "API key expired"
                    break
                else:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delays[attempt])
                    else:
                        error = f"HTTP {code}"

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                err_msg = f"Connection error: {type(e).__name__} - {str(e)}"
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delays[attempt])
                else:
                    error = err_msg

            except Exception as e:
                err_msg = f"{type(e).__name__}: {str(e)[:200]}"
                if attempt < max_retries - 1:
                    await asyncio.sleep(10)
                else:
                    error = err_msg
                    break

        duration_ms = int((time.time() - _agent_status[agent_id].get("started_at", time.time())) * 1000)

        if output:
            _agent_status[agent_id].update({"status": "done", "output": output, "duration_ms": duration_ms})
            km.mark_idle(agent_id)
            await db.update_agent_task(task_db_id, status="done", output=output, finished_at=time.time())
            
            await bus.emit(Event(
                type=EventType.AGENT_DONE, run_id=run_id,
                payload={"agent_id": agent_id, "agent_name": agent.name, "department": agent.department,
                         "output": output, "duration_ms": duration_ms, "key_index": agent.key_index}
            ))
        else:
            if not error:
                error = "Failed to generate output (empty content)"
            _agent_status[agent_id].update({"status": "error", "error": error})
            km.mark_error(agent_id)
            await db.update_agent_task(task_db_id, status="error", error=error, finished_at=time.time())
            
            await bus.emit(Event(
                type=EventType.AGENT_ERROR, run_id=run_id,
                payload={"agent_id": agent_id, "agent_name": agent.name, "error": error}
            ))

        await bus.emit(Event(
            type=EventType.KEY_IDLE, run_id=run_id,
            payload={"key_index": agent.key_index, "agent_id": agent_id}
        ))

        return {"agent_id": agent_id, "agent_name": agent.name, "role": agent.role,
                "department": agent.department, "output": output, "error": error}


async def _run_team_parallel(
    agents: list[AgentDef],
    base_task: str,
    run_id: str,
    task_db_ids: dict,
    bus: EventBus,
    km: KeyManager,
    semaphore: asyncio.Semaphore,
    use_live_web: bool = True,
    chain_context: str = "",
) -> str:
    """
    Run all agents in a team CONCURRENTLY (within that phase).
    Returns a synthesized string of all their outputs — fed into next team as chain_context.
    """
    tasks = [
        _run_agent(
            agent=a,
            task=a.goal_template.format(task=base_task),
            run_id=run_id,
            task_db_id=task_db_ids[a.id],
            bus=bus, km=km, semaphore=semaphore,
            use_live_web=use_live_web,
            chain_context=chain_context,
        )
        for a in agents
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Collect outputs and assemble them into a team summary string
    team_output_parts = []
    for r in results:
        if isinstance(r, dict) and r.get("output"):
            team_output_parts.append(
                f"**{r['role']} ({r['agent_name']}):**\n{r['output']}"
            )
    return "\n\n---\n\n".join(team_output_parts)


def _build_fallback_report(goal: str, chain_outputs: dict) -> str:
    lines = [
        "# Chief Marketing Intelligence System — Master Executive Report\n",
        f"**Target:** {goal[:200]}\n",
        "---\n"
    ]
    for phase_name, content in chain_outputs.items():
        lines.append(f"\n## {phase_name}\n")
        lines.append(content[:1500])
        lines.append("\n---\n")
    return "\n".join(lines)


async def run_company(goal: str) -> str:
    """
    Main entry point — runs the 7-phase sequential chain marketing intelligence pipeline.

    The output of each team is passed directly to the next:
    Site Profile → Trends → Competitors → Audience → Content → SEO+Analytics → Strategy → Master Report
    """
    global _agent_status, _current_run_id

    goal = goal.strip()
    loop = asyncio.get_running_loop()

    run_id = str(uuid.uuid4())[:8]
    _current_run_id = run_id
    bus = get_event_bus()
    km = get_key_manager()

    for agent in ALL_AGENTS:
        km.assign_to_agent(agent.id, agent.key_index)

    _agent_status = {a.id: a.to_dict() for a in ALL_AGENTS}
    await db.save_run(run_id, goal)

    await bus.emit(Event(
        type=EventType.RUN_STARTED, run_id=run_id,
        payload={"goal": goal, "run_id": run_id, "agent_count": len(ALL_AGENTS)}
    ))

    # Build agent groups by department
    def get_team(dept_name: str):
        return [a for a in ALL_AGENTS if a.department == dept_name]

    team_a = get_team("Team A: Trend Discovery")
    team_b = get_team("Team B: Competitor Intelligence")
    team_c = get_team("Team C: Audience Research")
    team_d = get_team("Team D: Content Engine")
    team_e = get_team("Team E: SEO")
    team_f = get_team("Team F: Analytics")
    team_g = get_team("Team G: Strategy")
    cmo    = [a for a in ALL_AGENTS if a.department == "Executive"]

    semaphore = asyncio.Semaphore(CONCURRENCY)

    # Pre-initialize all DB task records
    task_db_ids: dict[int, int] = {}
    for agent in ALL_AGENTS:
        task_prompt = agent.goal_template.format(task=goal)
        db_id = await db.save_agent_task(
            run_id, agent.id, agent.name, agent.department, agent.role, task_prompt
        )
        task_db_ids[agent.id] = db_id

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 0 — Target Website Deep Scraping
    # ─────────────────────────────────────────────────────────────────────────
    urls = web_scraper.extract_urls(goal)
    site_profile_text = ""
    target_url = ""

    if urls:
        target_url = urls[0]
        await bus.emit(Event(
            type=EventType.PHASE_CHANGED, run_id=run_id,
            payload={"phase": 0, "label": f"Phase 0: 🌐 Deep Scraping Target Website: {target_url}"}
        ))

        try:
            profile = await loop.run_in_executor(
                None, web_scraper.extract_target_website_profile, target_url
            )
            if profile and profile.get("summary"):
                site_profile_text = profile["summary"]
                await bus.emit(Event(
                    type=EventType.AGENT_THINKING, run_id=run_id,
                    payload={"agent_id": 1, "agent_name": "🕷 Web Scraper",
                             "thought": f"✅ Scraped {target_url} | Title: '{profile.get('title')}' | {len(profile.get('full_text', ''))} chars extracted"}
                ))
        except Exception as e:
            logger.error(f"Phase 0 scraping error: {e}")

    # Inject site profile into goal for all agents
    enriched_goal = goal
    if site_profile_text:
        enriched_goal = f"{goal}\n\n{site_profile_text}"
    if len(enriched_goal) > MAX_GOAL_LENGTH:
        enriched_goal = enriched_goal[:MAX_GOAL_LENGTH].rstrip() + "..."

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1 — Team A: Trend Discovery (finds live trending topics)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 1, "label": "Phase 1: 🔥 Team A — Live Trend Discovery (X, Reddit, HN, PH, GitHub)..."}
    ))

    team_a_task = (
        f"TARGET WEBSITE PROFILE:\n{site_profile_text[:1500] if site_profile_text else enriched_goal}\n\n"
        f"ORIGINAL GOAL: {goal}\n\n"
        "Discover ALL trending topics, viral keywords, fast-growing hashtags, and hot discussions "
        "on X/Twitter, Reddit, Hacker News, Product Hunt, GitHub Trending, and Google Trends "
        "that are DIRECTLY RELEVANT to this product and its category. "
        "Rank by: Growth Rate, Virality Potential, Audience Fit, Time Sensitivity, Competition Level. "
        "This output will be fed to the Competitor Intelligence team next."
    )

    trend_report = await _run_team_parallel(
        agents=team_a, base_task=team_a_task,
        run_id=run_id, task_db_ids=task_db_ids,
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=True, chain_context=""
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2 — Team B: Competitor Intelligence (fed by Team A's trends)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 2, "label": "Phase 2: 🕵️ Team B — Competitor Intelligence (Who ranks for those trends?)..."}
    ))

    team_b_task = (
        f"TARGET WEBSITE: {target_url or goal}\n"
        f"SITE PROFILE:\n{site_profile_text[:800] if site_profile_text else ''}\n\n"
        "Based on the trend report from Team A (provided below), identify and analyze ALL competitors "
        "who are currently ranking for these trends and topics. "
        "For each competitor: scrape their landing pages, extract their messaging/pricing/features, "
        "identify their weaknesses, and pinpoint GAPS in the market we can exploit. "
        "Produce competitor battlecards. This output goes to the Audience Research team next."
    )

    competitor_report = await _run_team_parallel(
        agents=team_b, base_task=team_b_task,
        run_id=run_id, task_db_ids=task_db_ids,
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=True,
        chain_context=f"TEAM A TREND REPORT:\n{trend_report[:3000]}"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 3 — Team C: Audience Research (fed by A + B)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 3, "label": "Phase 3: 👥 Team C — Audience Research (Who ARE these users?)..."}
    ))

    team_c_task = (
        f"TARGET WEBSITE: {target_url or goal}\n\n"
        "Based on the trend data (Team A) and competitor intelligence (Team B), "
        "deeply research the EXACT AUDIENCE for this product. "
        "Find: their real frustrations (use Reddit/forums/reviews verbatim), "
        "the exact words/phrases they use, buying triggers, objections, "
        "which communities they hang out in, and which influencers they follow. "
        "Map out 3 specific user personas. This output goes to the Content Engine next."
    )

    combined_ab = (
        f"TEAM A — TRENDS:\n{trend_report[:1500]}\n\n"
        f"TEAM B — COMPETITORS:\n{competitor_report[:1500]}"
    )

    audience_report = await _run_team_parallel(
        agents=team_c, base_task=team_c_task,
        run_id=run_id, task_db_ids=task_db_ids,
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=True,
        chain_context=combined_ab
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 4 — Team D: Content Engine (fed by A + B + C)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 4, "label": "Phase 4: ✍️ Team D — Content Engine (Generating all content assets)..."}
    ))

    team_d_task = (
        f"TARGET WEBSITE: {target_url or goal}\n"
        f"SITE PROFILE:\n{site_profile_text[:600] if site_profile_text else ''}\n\n"
        "Using the trend data (Team A), competitor gaps (Team B), and audience language/personas (Team C), "
        "create content for MAXIMUM USER ACQUISITION. The user has 4 Reddit accounts and 10+ Twitter accounts.\n\n"
        "PRIORITY ORDER (highest users first):\n"
        "── REDDIT (TOP PRIORITY — most users come from here) ──\n"
        "Write 8 Reddit posts across different subreddits, designed for 4 different accounts to rotate through.\n"
        "Each post MUST be: native, story-driven, educational, NOT promotional. No mention of 'our product'. \n"
        "Format: ACCOUNT_SLOT [1-4] | SUBREDDIT | POST TITLE | FULL POST BODY (200-400 words) | BEST TIME TO POST\n"
        "Target subreddits: r/SaaS, r/artificial, r/ChatGPT, r/MachineLearning, r/startups, r/Entrepreneur, r/webdev, r/programming, r/technology, r/ProductHunters\n"
        "Each post should naturally lead readers to discover the product themselves at the end.\n\n"
        "── X/TWITTER (SECOND PRIORITY) ──\n"
        "Write 10 individual tweets (each under 280 chars, punchy hooks, with trending hashtags).\n"
        "Write 2 complete threads (8 tweets each) — one educational, one controversial/opinion.\n"
        "Format each tweet: TWEET [N]: [text] | HASHTAGS: [#tags] | BEST TIME: [time]\n\n"
        "── PRODUCT HUNT ──\n"
        "Write: Tagline (under 60 chars) | Description (260 chars) | First Comment (the founder story post, 400 words)\n\n"
        "── LINKEDIN ──\n"
        "Write 3 LinkedIn posts (B2B/professional audience, authority-building, story-driven)\n\n"
        "── HACKER NEWS ──\n"
        "Write 1 Show HN post title + opening comment (developer audience, technical, honest)\n\n"
        "Use EXACT audience language from Team C. Fill competitor gaps from Team B. Ride trending topics from Team A."
    )

    combined_abc = (
        f"TEAM A — TRENDS:\n{trend_report[:1500]}\n\n"
        f"TEAM B — COMPETITOR GAPS:\n{competitor_report[:1500]}\n\n"
        f"TEAM C — AUDIENCE & PERSONAS:\n{audience_report[:2000]}"
    )

    content_report = await _run_team_parallel(
        agents=team_d, base_task=team_d_task,
        run_id=run_id, task_db_ids=task_db_ids,
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=True,  # Fixed: Team D needs live Reddit data to write trending content
        chain_context=combined_abc
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 5 — Team E (SEO) + Team F (Analytics) in parallel (fed by A+B+C+D)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 5, "label": "Phase 5: 🚀 Team E (SEO) + 📊 Team F (Analytics) — Optimizing & Predicting..."}
    ))

    combined_abcd = (
        f"TEAM A — TRENDS:\n{trend_report[:1000]}\n\n"
        f"TEAM B — COMPETITORS:\n{competitor_report[:1000]}\n\n"
        f"TEAM C — AUDIENCE:\n{audience_report[:1000]}\n\n"
        f"TEAM D — CONTENT:\n{content_report[:1500]}"
    )

    team_e_task = (
        f"TARGET WEBSITE: {target_url or goal}\n\n"
        "Using trend data, competitor keyword gaps, and the content already created, "
        "generate a complete SEO strategy:\n"
        "1. 20 target keywords (mix of high-volume and long-tail, include ranking difficulty)\n"
        "2. Topical authority cluster map (1 pillar page + 8 cluster articles)\n"
        "3. Meta titles and descriptions for 5 core pages\n"
        "4. Internal linking strategy\n"
        "5. 3 linkable asset ideas to attract backlinks\n"
        "6. Technical SEO checklist\n"
        "Focus on keywords that will rank when people search terms related to this product."
    )

    team_f_task = (
        f"TARGET WEBSITE: {target_url or goal}\n\n"
        "Analyze all content assets created by Team D and predict:\n"
        "1. Expected traffic per channel (X, LinkedIn, Reddit, Organic Search, YouTube) per month\n"
        "2. Expected signup conversion rates by source\n"
        "3. Score every content piece using ICE framework (Impact, Confidence, Ease — 1-10 each)\n"
        "4. Estimated time to first 100, 1000, 10000 website visitors\n"
        "5. Which single piece of content is most likely to go viral and why\n"
        "6. A/B test suggestions for headlines and CTAs\n"
        "Be specific with numbers and probability estimates."
    )

    seo_report, analytics_report = await asyncio.gather(
        _run_team_parallel(
            agents=team_e, base_task=team_e_task,
            run_id=run_id, task_db_ids=task_db_ids,
            bus=bus, km=km, semaphore=semaphore,
            use_live_web=True, chain_context=combined_abcd
        ),
        _run_team_parallel(
            agents=team_f, base_task=team_f_task,
            run_id=run_id, task_db_ids=task_db_ids,
            bus=bus, km=km, semaphore=semaphore,
            use_live_web=False, chain_context=combined_abcd
        )
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 6 — Team G: Strategy (synthesizes the whole chain into ranked plan)
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 6, "label": "Phase 6: 🎯 Team G — Strategy (Ranked Action Plan for Maximum Users)..."}
    ))

    full_chain = (
        f"TEAM A — TRENDS:\n{trend_report[:800]}\n\n"
        f"TEAM B — COMPETITORS:\n{competitor_report[:800]}\n\n"
        f"TEAM C — AUDIENCE:\n{audience_report[:800]}\n\n"
        f"TEAM D — CONTENT:\n{content_report[:800]}\n\n"
        f"TEAM E — SEO:\n{seo_report[:800]}\n\n"
        f"TEAM F — ANALYTICS:\n{analytics_report[:800]}"
    )

    team_g_task = (
        f"TARGET WEBSITE: {target_url or goal}\n\n"
        "All 6 intelligence teams have delivered their reports. "
        "Now synthesize everything into the FINAL RANKED MARKETING ACTION PLAN:\n\n"
        "1. TOP 3 ACTIONS TO DO TODAY (highest impact for fastest user growth)\n"
        "2. DAY 1–7 PLAN (exact daily tasks, what to post, where, when)\n"
        "3. DAY 8–30 PLAN (milestones, content calendar, SEO targets)\n"
        "4. CHANNEL PRIORITY RANKING (which platform to focus on FIRST and why)\n"
        "5. SINGLE HIGHEST-LEVERAGE MOVE (one thing that will 10x the results)\n"
        "6. HOW TO RANK ON GOOGLE for [product name] searches — step by step\n"
        "7. RISK FLAGS — what could fail and how to avoid it\n"
        "Use the analytics predictions from Team F to rank every recommendation by confidence."
    )

    strategy_report = await _run_team_parallel(
        agents=team_g, base_task=team_g_task,
        run_id=run_id, task_db_ids=task_db_ids,
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=True,
        chain_context=full_chain
    )

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 7 — Chief Marketing Intelligence Officer Final Master Report
    # ─────────────────────────────────────────────────────────────────────────
    await bus.emit(Event(
        type=EventType.PHASE_CHANGED, run_id=run_id,
        payload={"phase": 7, "label": "Phase 7: 👑 Chief Marketing Intelligence Officer — Master Executive Report..."}
    ))

    _agent_status[1]["status"] = "synthesizing"
    _agent_status[1]["current_task"] = "Synthesizing master report from 7-team intelligence chain..."

    master_synthesis_prompt = (
        f"TARGET WEBSITE: {target_url or goal}\n\n"
        f"=== COMPLETE INTELLIGENCE CHAIN ===\n\n"
        f"TEAM A (LIVE TRENDS FROM WEB/REDDIT/HN):\n{trend_report[:1200]}\n\n"
        f"TEAM B (COMPETITORS):\n{competitor_report[:1000]}\n\n"
        f"TEAM C (AUDIENCE — real Reddit user language & pain points):\n{audience_report[:1200]}\n\n"
        f"TEAM D (CONTENT — drafted posts & copy):\n{content_report[:2000]}\n\n"
        f"TEAM E (SEO):\n{seo_report[:600]}\n\n"
        f"TEAM F (ANALYTICS — traffic & conversion predictions):\n{analytics_report[:600]}\n\n"
        f"TEAM G (STRATEGY — ranked action plan):\n{strategy_report[:1000]}\n\n"
        "=== YOUR TASK: OUTPUT A COMPLETE COPY-PASTE POSTING PACK ===\n\n"
        "The user has 4 Reddit accounts and 10+ Twitter/X accounts. They will manually copy-paste and post.\n"
        "Your job: produce a COMPLETE, READY-TO-POST pack. NO summaries. NO generic advice. ONLY post-ready content.\n"
        "Every post must be fully written — title, body, hashtags. NOTHING left as a placeholder.\n\n"
        "Use this EXACT format:\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🔴 REDDIT — ACCOUNT 1 (post these first, highest priority)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "POST 1\n"
        "Subreddit: r/[name]\n"
        "Flair: [flair if applicable]\n"
        "Best Time: [Day, Time in EST]\n"
        "TITLE: [exact post title]\n"
        "BODY:\n[Complete post body, 200-400 words, community-native tone, NO promotional language, \n"
        " story/educational/question format, product mentioned naturally at end only if relevant]\n\n"
        "POST 2\n"
        "[same format, different subreddit]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🔴 REDDIT — ACCOUNT 2\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "POST 3\n"
        "[same format, different subreddits — space out by 1-2 days from Account 1]\n\n"
        "POST 4\n"
        "[same format]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🔴 REDDIT — ACCOUNT 3\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "POST 5\n"
        "[same format]\n\n"
        "POST 6\n"
        "[same format]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🔴 REDDIT — ACCOUNT 4\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "POST 7\n"
        "[same format]\n\n"
        "POST 8\n"
        "[same format]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🐦 TWITTER / X — VIRAL TWEETS (post from different accounts, spread across the week)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "TWEET 1: [exact text under 280 chars] | Best Time: [day+time EST]\n"
        "TWEET 2: [exact text]\n"
        "TWEET 3: [exact text]\n"
        "TWEET 4: [exact text]\n"
        "TWEET 5: [exact text]\n"
        "TWEET 6: [exact text]\n\n"
        "🧵 THREAD 1 — Educational (post as one account, retweet from others)\n"
        "Tweet 1/8: [text] — strong hook, make them want to read on\n"
        "Tweet 2/8: [text]\n"
        "Tweet 3/8: [text]\n"
        "Tweet 4/8: [text]\n"
        "Tweet 5/8: [text]\n"
        "Tweet 6/8: [text]\n"
        "Tweet 7/8: [text]\n"
        "Tweet 8/8: [text + link to product]\n\n"
        "🧵 THREAD 2 — Hot Take / Opinion (controversial, high engagement)\n"
        "[same 8-tweet format]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🚀 PRODUCT HUNT LAUNCH PACK\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "TAGLINE (max 60 chars): [tagline]\n"
        "DESCRIPTION (max 260 chars): [description]\n"
        "TOPICS/TAGS: [3-5 relevant PH topics]\n"
        "FIRST COMMENT (founder story, 400 words, paste this right after launch goes live):\n"
        "[full first comment text]\n\n"
        "HUNTER NOTE: Schedule your launch for 12:01 AM PST Tuesday or Wednesday for max upvotes.\n"
        "Ask all 4 Reddit accounts to upvote and comment — post in r/ProductHunters the same day.\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "💼 LINKEDIN — 3 POSTS\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "POST 1 (Best Time: Tuesday 8am EST):\n[full post, 150-250 words, no hashtag spam, 1-3 hashtags max]\n\n"
        "POST 2 (Best Time: Wednesday 12pm EST):\n[full post]\n\n"
        "POST 3 (Best Time: Thursday 9am EST):\n[full post]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "💻 HACKER NEWS — SHOW HN\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "TITLE: Show HN: [title — honest, technical, specific]\n"
        "FIRST COMMENT (paste immediately after submitting, 200 words, technical, vulnerable):\n"
        "[full text]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📅 7-DAY POSTING SCHEDULE (copy this as your calendar)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "DAY 1 (Monday):\n"
        "  09:00 EST — [Platform]: POST [N] from Account [X]\n"
        "  12:00 EST — [Platform]: [what to post]\n"
        "  ...(continue for all 7 days, mapping all posts above to specific day/time/account)\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "⚠️ ANTI-BAN RULES (follow these to protect all accounts)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "[List 8 specific rules for safe multi-account Reddit and Twitter posting without getting banned]\n"
    )

    await db.update_agent_task(task_db_ids[1], task_prompt=master_synthesis_prompt)

    cmo_result = await _run_agent(
        agent=cmo[0],
        task=master_synthesis_prompt,
        run_id=run_id,
        task_db_id=task_db_ids[1],
        bus=bus, km=km, semaphore=semaphore,
        use_live_web=False,
        chain_context=""
    )
    final_output = cmo_result.get("output")

    if not final_output:
        chain_outputs = {
            "Trend Report": trend_report,
            "Competitor Report": competitor_report,
            "Audience Report": audience_report,
            "Content Report": content_report,
            "SEO Report": seo_report,
            "Analytics Report": analytics_report,
            "Strategy Report": strategy_report,
        }
        final_output = _build_fallback_report(goal, chain_outputs)
        _agent_status[1].update({"status": "done", "output": final_output})
        await db.update_agent_task(task_db_ids[1], status="done", output=final_output, finished_at=time.time())

    await db.update_run(run_id, status="complete", finished_at=time.time(), final_output=final_output)

    # Count actual successful agents for the contributors metric
    successful_agents = sum(1 for s in _agent_status.values() if s.get("status") == "done")
    await bus.emit(Event(
        type=EventType.RUN_COMPLETE, run_id=run_id,
        payload={"run_id": run_id, "final_output": final_output, "contributors": successful_agents}
    ))

    return final_output
