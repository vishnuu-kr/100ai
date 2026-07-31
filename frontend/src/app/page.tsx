"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Agent } from "@/components/AgentCard";
import { AgentDetail } from "@/components/AgentDetail";
import { LiveFeed } from "@/components/LiveFeed";
import { ResultPanel } from "@/components/ResultPanel";
import { GoalInput } from "@/components/GoalInput";
import { AppShell } from "@/components/app-shell";
import { Dashboard as AnalyticsDashboard } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KeyIcon, DatabaseIcon, CheckCircle2Icon, AlertCircleIcon, PlayIcon } from "lucide-react";

const API = "http://localhost:8000";
const WS  = "ws://localhost:8000/ws";

const DEPT_ORDER = [
  "Executive",
  "Team A: Trend Discovery",
  "Team B: Competitor Intelligence",
  "Team C: Audience Research",
  "Team D: Content Engine",
  "Team E: SEO",
  "Team F: Analytics",
  "Team G: Strategy",
];

const DEPT_ICONS: Record<string, string> = {
  Executive: "👑",
  "Team A: Trend Discovery": "🔥",
  "Team B: Competitor Intelligence": "🕵️",
  "Team C: Audience Research": "👥",
  "Team D: Content Engine": "✍️",
  "Team E: SEO": "🚀",
  "Team F: Analytics": "📊",
  "Team G: Strategy": "🎯",
};

const DEPT_COLORS: Record<string, string> = {
  Executive: "#FFD700",
  "Team A: Trend Discovery": "#FF5722",
  "Team B: Competitor Intelligence": "#3F51B5",
  "Team C: Audience Research": "#E91E63",
  "Team D: Content Engine": "#9C27B0",
  "Team E: SEO": "#00BCD4",
  "Team F: Analytics": "#4CAF50",
  "Team G: Strategy": "#FF9800",
};

function StatusDot({ status }: { status: string }) {
  return <span className={`dot dot-${status}`} style={{ width: 7, height: 7 }} />;
}

function AgentMini({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const s = agent.status || "idle";
  const isActive = s === "working" || s === "synthesizing";
  return (
    <button
      onClick={onClick}
      className={`agent-card ${s}`}
      style={{
        width: "100%", textAlign: "left",
        borderLeftWidth: isActive ? 2 : 1,
        borderLeftColor: isActive ? DEPT_COLORS[agent.department] || "var(--border)" : undefined,
        padding: "8px 9px",
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5" style={{ minWidth: 0 }}>
        <StatusDot status={s} />
        <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)", flex: 1, fontSize: 11 }}>
          {agent.name.split(" ")[0]}
        </span>
        {s === "done" && <span style={{ color: "var(--green)", fontSize: 9, flexShrink: 0 }}>✓</span>}
        {s === "error" && <span style={{ color: "var(--red)", fontSize: 9, flexShrink: 0 }}>✗</span>}
      </div>
      <div className="truncate" style={{ color: "var(--text-muted)", fontSize: 9, lineHeight: 1.3 }}>
        {agent.role.replace(/ (Lead|Specialist|Manager|Engineer|Analyst|Strategist|Expert|Officer|Architect|Developer|Scout|Researcher|Planner|Hacker|Director)$/, "")}
      </div>
      {isActive && (
        <div className="truncate" style={{ color: s === "synthesizing" ? "var(--purple)" : "var(--green)", fontSize: 8, marginTop: 2 }}>
          {s === "synthesizing" ? "✦ synthesizing…" : "⚡ working…"}
        </div>
      )}
    </button>
  );
}

function DeptBlock({ name, agents, onAgentClick }: { name: string; agents: Agent[]; onAgentClick: (a: Agent) => void }) {
  const color = DEPT_COLORS[name] || "var(--text-secondary)";
  const icon = DEPT_ICONS[name] || "👤";
  const working = agents.filter(a => ["working","synthesizing"].includes(a.status)).length;
  const done = agents.filter(a => a.status === "done").length;
  const errors = agents.filter(a => a.status === "error").length;
  const total = agents.length;

  return (
    <div className="glass mb-3" style={{ padding: "12px 14px" }}>
      {/* Dept Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span className="font-bold tracking-wider" style={{ color, fontSize: 11 }}>
          {name.toUpperCase()}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{total}</span>
        <div className="flex items-center gap-2 ml-auto">
          {working > 0 && (
            <span className="flex items-center gap-1" style={{ color: "var(--green)", fontSize: 10 }}>
              <span className="dot dot-working" style={{ width: 5, height: 5 }} />
              {working}
            </span>
          )}
          {done > 0 && (
            <span style={{ color: "var(--blue)", fontSize: 10, fontWeight: 600 }}>
              {done}✓
            </span>
          )}
          {errors > 0 && (
            <span style={{ color: "var(--red)", fontSize: 10 }}>
              {errors}✗
            </span>
          )}
        </div>
      </div>

      {/* Mini progress bar for this dept */}
      {(done > 0 || errors > 0) && (
        <div className="mb-2" style={{ height: 2, background: "var(--border)", borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.round((done / total) * 100)}%`,
            background: errors > done ? "var(--red)" : color,
            borderRadius: 1,
            transition: "width 0.5s ease",
          }} />
        </div>
      )}

      {/* Agent grid */}
      <div className="agent-grid">
        {agents.map(agent => (
          <AgentMini key={agent.id} agent={agent} onClick={() => onAgentClick(agent)} />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const { events, connected } = useWebSocket(WS);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState("");
  const [phase, setPhase] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [contributors, setContributors] = useState(0);
  const [activeHash, setActiveHash] = useState("#control-room");
  const [keys, setKeys] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || "#control-room";
      setActiveHash(hash);
      if (hash === "#keys") fetchKeys();
      if (hash === "#logs") fetchRuns();
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // initial execution
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Initial load
  useEffect(() => {
    fetchAgents();
  }, []);

  // Poll agents while running
  useEffect(() => {
    if (isRunning) {
      pollRef.current = setInterval(() => {
        fetchAgents();
        if (activeHash === "#keys") fetchKeys();
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isRunning, activeHash]);

  useEffect(() => {
    if (!events.length) return;
    const e = events[0];

    if (e.type === "run_started") {
      setIsRunning(true);
      setFinalOutput(null);
      setPhase(1);
      setContributors(0);
    }
    if (e.type === "phase_changed") {
      setPhase(e.payload.phase as number);
      setPhaseLabel(e.payload.label as string);
    }
    if (e.type === "run_complete") {
      setIsRunning(false);
      setFinalOutput(e.payload.final_output as string);
      setContributors(e.payload.contributors as number || 0);
      setPhase(7);
      fetchAgents();
    }
    if (e.type === "run_failed") {
      setIsRunning(false);
    }

    // Instant status updates from WS
    if (e.type === "agent_assigned") {
      const p = e.payload;
      setAgents(prev => prev.map(a => a.id === p.agent_id
        ? { ...a, status: "working", current_task: String(p.task).slice(0, 120) } : a));
    }
    if (e.type === "agent_done") {
      const p = e.payload;
      setAgents(prev => prev.map(a => a.id === p.agent_id
        ? { ...a, status: "done", output: p.output as string, duration_ms: p.duration_ms as number } : a));
    }
    if (e.type === "agent_error") {
      const p = e.payload;
      setAgents(prev => prev.map(a => a.id === p.agent_id ? { ...a, status: "error" } : a));
    }
    if (e.type === "phase_changed" && e.payload.phase === 3) {
      setAgents(prev => prev.map(a => a.id === 1 ? { ...a, status: "synthesizing" } : a));
    }
  }, [events]);

  async function fetchAgents() {
    try {
      const r = await fetch(`${API}/api/agents`);
      const d = await r.json();
      if (d.agents) setAgents(d.agents);
    } catch {}
  }

  async function fetchKeys() {
    try {
      const r = await fetch(`${API}/api/keys`);
      const d = await r.json();
      if (d.keys) setKeys(d.keys);
    } catch {}
  }

  async function fetchRuns() {
    try {
      const r = await fetch(`${API}/api/runs`);
      const d = await r.json();
      if (d.runs) setRuns(d.runs);
    } catch {}
  }

  async function handleRun(goal: string) {
    setCurrentGoal(goal.slice(0, 200));
    setFinalOutput(null);
    setPhase(0);
    setContributors(0);
    setAgents(prev => prev.map(a => ({ ...a, status: "idle", current_task: undefined, output: undefined })));
    setIsRunning(true);
    try {
      await fetch(`${API}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
    } catch {
      setIsRunning(false);
      alert("Cannot connect to backend. Is it running on port 8000?");
    }
  }

  async function handleLoadRun(runId: string) {
    try {
      const r = await fetch(`${API}/api/runs/${runId}`);
      const d = await r.json();
      if (d.run) {
        setCurrentGoal(d.run.goal);
        setFinalOutput(d.run.final_output);
        setContributors(d.tasks.filter((t: any) => t.status === "done").length);
        
        // Map historical tasks back to agent cards status
        setAgents(prev => prev.map(agent => {
          const task = d.tasks.find((t: any) => t.agent_id === agent.id);
          if (task) {
            return {
              ...agent,
              status: task.status,
              output: task.output,
              current_task: task.task_prompt,
            };
          }
          return { ...agent, status: "idle", output: undefined, current_task: undefined };
        }));

        window.location.hash = "#control-room";
      }
    } catch {
      alert("Failed to load historical run details from database.");
    }
  }

  const working = agents.filter(a => a.status === "working").length;
  const synthesizing = agents.filter(a => a.status === "synthesizing").length;
  const done = agents.filter(a => a.status === "done").length;
  const errors = agents.filter(a => a.status === "error").length;
  const totalAgents = agents.length || 100;

  const byDept = useMemo(() => {
    const m: Record<string, Agent[]> = {};
    for (const a of agents) { m[a.department] = m[a.department] ?? []; m[a.department].push(a); }
    return m;
  }, [agents]);

  // Render current tab content
  const renderContent = () => {
    switch (activeHash) {
      case "#analytics":
        return <AnalyticsDashboard agents={agents} events={events} />;

      case "#keys":
        return (
          <div className="flex flex-col gap-4">
            <Card className="dark:bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <KeyIcon className="size-5 text-purple-400" />
                    <span>API Key Manager</span>
                  </CardTitle>
                  <CardDescription>
                    Assigns exactly 1 key per agent from the 100 loaded keys.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs font-mono">
                  Loaded keys: {keys.length || 100}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Slot / Key Index</TableHead>
                      <TableHead>Mapped Agent</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="pr-6 text-end">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.length > 0 ? (
                      keys.map((keySlot) => {
                        const agent = agents.find(a => a.key_index === keySlot.index);
                        return (
                          <TableRow key={keySlot.index}>
                            <TableCell className="pl-6 font-mono font-bold text-xs">
                              Key #{keySlot.index + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-xs text-primary">
                              {agent ? agent.name : `Agent #${keySlot.index + 1}`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {agent ? agent.department : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {agent ? agent.role : "—"}
                            </TableCell>
                            <TableCell className="pr-6 text-end">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                keySlot.status === "busy" ? "bg-emerald-500/10 text-emerald-400" :
                                keySlot.status === "rate_limited" ? "bg-yellow-500/10 text-yellow-400" :
                                keySlot.status === "expired" ? "bg-red-500/10 text-red-400" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                <span className={`dot dot-${
                                  keySlot.status === "busy" ? "working" :
                                  keySlot.status === "rate_limited" ? "thinking" :
                                  keySlot.status === "expired" ? "error" : "idle"
                                }`} style={{ width: 5, height: 5 }} />
                                {keySlot.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                          Loading key configurations...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "#logs":
        return (
          <div className="flex flex-col gap-4">
            <Card className="dark:bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseIcon className="size-5 text-blue-400" />
                    <span>Run logs database</span>
                  </CardTitle>
                  <CardDescription>
                    Historical record of company execution goals and synthesis results.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Run ID</TableHead>
                      <TableHead>Goal / Prompt</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-end">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length > 0 ? (
                      runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="pl-6 font-mono font-bold text-xs">
                            #{run.id}
                          </TableCell>
                          <TableCell className="max-w-md truncate font-semibold text-xs text-primary">
                            {run.goal}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(run.started_at * 1000).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              run.status === "complete" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {run.status === "complete" ? (
                                <CheckCircle2Icon className="size-3" />
                              ) : (
                                <AlertCircleIcon className="size-3" />
                              )}
                              {run.status}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadRun(run.id)}
                              className="h-7 text-[10px] font-bold"
                            >
                              <PlayIcon className="size-2.5 mr-1" /> Load
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                          No historical runs recorded in database.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "#control-room":
      default:
        return (
          <div className="flex flex-col gap-4">
            {/* Goal Input / Website Sandbox */}
            <GoalInput onSubmit={handleRun} isRunning={isRunning} />

            {/* Sequential Intelligence Chain Pipeline Visualizer */}
            {(isRunning || phase > 0) && (() => {
              const CHAIN = [
                { p: 0, icon: "🌐", label: "Scraping Site" },
                { p: 1, icon: "🔥", label: "Trends" },
                { p: 2, icon: "🕵️", label: "Competitors" },
                { p: 3, icon: "👥", label: "Audience" },
                { p: 4, icon: "✍️", label: "Content" },
                { p: 5, icon: "🚀", label: "SEO + Analytics" },
                { p: 6, icon: "🎯", label: "Strategy" },
                { p: 7, icon: "👑", label: "Master Report" },
              ];
              return (
                <div className="glass" style={{ padding: "12px 16px", borderRadius: 12 }}>
                  <div className="flex items-center gap-1 flex-wrap">
                    {CHAIN.map((step, i) => {
                      const isActive = phase === step.p && isRunning;
                      const isDone = phase > step.p || (!isRunning && phase >= step.p);
                      return (
                        <React.Fragment key={step.p}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 8,
                            background: isActive ? "rgba(37,99,235,0.2)" : isDone ? "rgba(34,197,94,0.08)" : "transparent",
                            border: isActive ? "1px solid rgba(37,99,235,0.5)" : isDone ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                            transition: "all 0.3s",
                          }}>
                            <span style={{ fontSize: 13 }}>{step.icon}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              color: isActive ? "#60a5fa" : isDone ? "#4ade80" : "var(--text-muted)",
                              letterSpacing: "0.03em",
                            }}>
                              {step.label}
                            </span>
                            {isActive && <span className="dot dot-working" style={{ width: 5, height: 5 }} />}
                            {isDone && <span style={{ color: "#4ade80", fontSize: 9 }}>✓</span>}
                          </div>
                          {i < CHAIN.length - 1 && (
                            <span style={{ color: phase > step.p ? "#4ade80" : "var(--border)", fontSize: 11, fontWeight: 600 }}>→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {phaseLabel && (
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                      {phaseLabel}
                    </p>
                  )}
                </div>
              );
            })()}

            {currentGoal && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 2 }}>
                Target:{" "}
                <span style={{ color: "var(--blue)" }}>
                  {currentGoal.slice(0, 120)}
                </span>
              </p>
            )}

            {/* Layout Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 440px)", gap: 16 }}>
              {/* LEFT: Departments */}
              <div style={{ minWidth: 0 }}>
                {DEPT_ORDER.map(dept =>
                  byDept[dept]?.length ? (
                    <DeptBlock
                      key={dept}
                      name={dept}
                      agents={byDept[dept]}
                      onAgentClick={setSelectedAgent}
                    />
                  ) : null
                )}
                {agents.length === 0 && (
                  <div className="glass flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading 100 agents…</p>
                  </div>
                )}
              </div>

              {/* RIGHT: Live Feed + Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                {/* Live Feed */}
                <div className="glass" style={{ height: 340, display: "flex", flexDirection: "column", padding: "14px 16px" }}>
                  <div className="flex items-center gap-2 mb-3" style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                      LIVE ACTIVITY
                    </span>
                    {events.length > 0 && (
                      <span className="glass" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, color: "var(--text-muted)" }}>
                        {events.length}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <LiveFeed events={events} />
                  </div>
                </div>

                {/* Result Panel */}
                <div style={{ flex: 1 }}>
                  <ResultPanel
                    output={finalOutput}
                    isRunning={isRunning}
                    agentsWorking={working + synthesizing}
                    agentsDone={done}
                    agentsError={errors}
                    totalAgents={totalAgents}
                    contributors={contributors}
                    phase={phase}
                    phaseLabel={phaseLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AppShell>
      {renderContent()}
      <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </AppShell>
  );
}
