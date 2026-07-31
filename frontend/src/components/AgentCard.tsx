"use client";

import React from "react";

export interface Agent {
  id: number;
  name: string;
  role: string;
  department: string;
  specialty?: string;
  status: "idle" | "working" | "done" | "error" | "synthesizing";
  current_task?: string;
  output?: string;
  duration_ms?: number;
  key_index?: number;
  key_status?: string;
}

interface AgentCardProps {
  agent: Agent;
  onClick: (agent: Agent) => void;
}

const statusLabel: Record<string, string> = {
  idle: "Idle",
  working: "Working",
  done: "Done",
  error: "Error",
  synthesizing: "Synthesizing",
};

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const status = agent.status || "idle";

  return (
    <div
      className={`agent-card ${status}`}
      onClick={() => onClick(agent)}
      title={`${agent.name} — ${agent.role}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`dot dot-${status}`} />
        <span
          className="text-xs font-semibold truncate"
          style={{ color: "var(--text-primary)", maxWidth: "90px" }}
        >
          {agent.name.split(" ")[0]}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          #{String(agent.id).padStart(3, "0")}
        </span>
      </div>
      <div
        className="text-xs truncate mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {agent.role}
      </div>
      {agent.current_task && status === "working" && (
        <div
          className="text-xs truncate italic"
          style={{ color: "var(--text-muted)", fontSize: "10px" }}
        >
          {agent.current_task.slice(0, 60)}
          {agent.current_task.length > 60 ? "…" : ""}
        </div>
      )}
      {status === "done" && (
        <div className="text-xs" style={{ color: "var(--green)", fontSize: "10px" }}>
          ✓ Complete
          {agent.duration_ms
            ? ` · ${(agent.duration_ms / 1000).toFixed(1)}s`
            : ""}
        </div>
      )}
      {status === "error" && (
        <div className="text-xs" style={{ color: "var(--red)", fontSize: "10px" }}>
          ✗ Error
        </div>
      )}
      {status === "synthesizing" && (
        <div className="text-xs" style={{ color: "var(--purple)", fontSize: "10px" }}>
          ✦ Synthesizing…
        </div>
      )}
    </div>
  );
}
