"use client";

import React from "react";

import type { Agent } from "./AgentCard";

interface DeptSectionProps {
  name: string;
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
}

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

export function DeptSection({ name, agents, onAgentClick }: DeptSectionProps) {
  const color = DEPT_COLORS[name] ?? "var(--text-secondary)";
  const icon = DEPT_ICONS[name] ?? "👤";

  const working = agents.filter((a) => a.status === "working" || a.status === "synthesizing").length;
  const done = agents.filter((a) => a.status === "done").length;
  const errors = agents.filter((a) => a.status === "error").length;

  return (
    <div className="mb-4">
      {/* Dept header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span className="text-xs font-bold tracking-wider" style={{ color }}>
          {name.toUpperCase()}
        </span>
        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
          {agents.length} agents
        </span>
        {working > 0 && (
          <span className="ml-auto text-xs" style={{ color: "var(--green)" }}>
            {working} working
          </span>
        )}
        {done > 0 && working === 0 && (
          <span className="ml-auto text-xs" style={{ color: "var(--blue)" }}>
            {done} done
          </span>
        )}
        {errors > 0 && (
          <span className="text-xs" style={{ color: "var(--red)" }}>
            {errors} err
          </span>
        )}
      </div>

      {/* Agent grid */}
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        }}
      >
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-card ${agent.status}`}
            onClick={() => onAgentClick(agent)}
            style={{
              borderLeftWidth: "2px",
              borderLeftColor: agent.status !== "idle" ? color : "var(--border)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`dot dot-${agent.status}`} />
              <span
                className="text-xs font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {agent.name.split(" ")[0]}
              </span>
            </div>
            <div
              className="text-xs truncate"
              style={{ color: "var(--text-muted)", fontSize: "10px" }}
            >
              {agent.role.replace(/ (Lead|Specialist|Manager|Engineer|Analyst|Strategist|Expert)$/, "")}
            </div>
            {agent.status === "done" && (
              <div style={{ color: "var(--green)", fontSize: "9px", marginTop: 2 }}>✓</div>
            )}
            {agent.status === "error" && (
              <div style={{ color: "var(--red)", fontSize: "9px", marginTop: 2 }}>✗</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
