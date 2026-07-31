"use client";

import React from "react";
import type { AgentEvent } from "@/hooks/useWebSocket";

interface LiveFeedProps {
  events: AgentEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  run_started: "🚀",
  run_complete: "🏆",
  run_failed: "💥",
  phase_changed: "⚡",
  agent_assigned: "📋",
  agent_thinking: "💭",
  agent_done: "✅",
  agent_error: "❌",
  agent_retrying: "🔄",
  tool_called: "🔧",
  tool_result: "📦",
  message_sent: "💬",
  key_busy: "🔑",
  key_idle: "🔓",
  key_rate_limited: "⏳",
  key_expired: "🔒",
};

const EVENT_CLASS: Record<string, string> = {
  run_started: "phase",
  run_complete: "done",
  phase_changed: "phase",
  agent_assigned: "working",
  agent_thinking: "working",
  agent_done: "done",
  agent_error: "error",
  agent_retrying: "working",
};

function formatEvent(event: AgentEvent): string {
  const p = event.payload;
  switch (event.type) {
    case "run_started":
      return `Company started on: "${String(p.goal).slice(0, 80)}…"`;
    case "run_complete":
      return "🏆 CEO has synthesized the final result!";
    case "phase_changed":
      return `Phase ${p.phase}: ${p.label}`;
    case "agent_assigned":
      return `${p.agent_name} (${p.department}) → task assigned`;
    case "agent_thinking":
      return `${p.agent_name}: ${p.thought || "thinking..."}`;
    case "agent_done":
      return `${p.agent_name} ✓ done in ${p.duration_ms ? ((p.duration_ms as number) / 1000).toFixed(1) : "?"}s`;
    case "agent_error":
      return `${p.agent_name} ✗ ${p.error}`;
    case "agent_retrying":
      return `Agent #${p.agent_id} retrying (attempt ${p.attempt})`;
    case "key_rate_limited":
      return `Key #${(p.key_index as number) + 1} rate limited, waiting ${p.retry_after}s`;
    case "key_busy":
      return `Key #${(p.key_index as number) + 1} → busy (Agent #${p.agent_id})`;
    default:
      return event.type;
  }
}

export function LiveFeed({ events }: LiveFeedProps) {
  const displayed = events.slice(0, 60);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      {displayed.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-full"
          style={{ color: "var(--text-muted)" }}
        >
          <p className="text-3xl mb-3">📡</p>
          <p className="text-sm">Waiting for events…</p>
          <p className="text-xs mt-1">Submit a goal to start</p>
        </div>
      ) : (
        displayed.map((e, i) => (
          <div
            key={i}
            className={`feed-item ${EVENT_CLASS[e.type] ?? ""}`}
          >
            <div className="flex items-start gap-2">
              <span style={{ fontSize: "13px", flexShrink: 0 }}>
                {EVENT_ICONS[e.type] ?? "•"}
              </span>
              <div>
                <p className="text-xs" style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {formatEvent(e)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {new Date(e.timestamp * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
