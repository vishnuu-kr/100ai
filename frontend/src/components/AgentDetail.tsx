"use client";

import React, { useEffect, useState } from "react";
import { parseMarkdown } from "@/lib/markdown";
import type { Agent } from "./AgentCard";

interface AgentDetailProps {
  agent: Agent | null;
  onClose: () => void;
}

interface TaskRecord {
  id: number;
  task_prompt: string;
  status: string;
  output?: string;
  error?: string;
  started_at?: number;
  finished_at?: number;
}

export function AgentDetail({ agent, onClose }: AgentDetailProps) {
  const [detail, setDetail] = useState<{ tasks: TaskRecord[] } | null>(null);
  const isOpen = !!agent;

  useEffect(() => {
    if (!agent) { setDetail(null); return; }
    fetch(`http://localhost:8000/api/agents/${agent.id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => setDetail(null));
  }, [agent]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(3,7,18,0.6)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`slide-panel ${isOpen ? "open" : ""}`}>
        {agent && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`dot dot-${agent.status}`} style={{ width: 10, height: 10 }} />
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {agent.name}
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "var(--border)",
                      color: "var(--text-secondary)",
                      fontFamily: "monospace",
                    }}
                  >
                    #{String(agent.id).padStart(3, "0")}
                  </span>
                </div>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  {agent.role}
                </p>
                <span
                  className={`dept-badge bg-dept-${agent.department} dept-${agent.department}`}
                  style={{ border: "1px solid" }}
                >
                  {agent.department}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-xl leading-none hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Specialty */}
            {agent.specialty && (
              <div className="glass p-3 rounded-lg mb-4">
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  SPECIALTY
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {agent.specialty}
                </p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass p-3 rounded-lg text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>KEY</p>
                <p className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                  #{(agent.key_index ?? 0) + 1}
                </p>
              </div>
              <div className="glass p-3 rounded-lg text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>STATUS</p>
                <p className="text-sm capitalize" style={{ color: statusColor(agent.status) }}>
                  {agent.status}
                </p>
              </div>
              <div className="glass p-3 rounded-lg text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>TIME</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {agent.duration_ms ? `${(agent.duration_ms / 1000).toFixed(1)}s` : "—"}
                </p>
              </div>
            </div>

            {/* Tasks / Output */}
            {detail?.tasks && detail.tasks.length > 0 ? (
              <div>
                {detail.tasks.map((t) => (
                  <div key={t.id} className="mb-6">
                    {/* Task prompt */}
                    <div className="glass p-4 rounded-lg mb-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                        TASK ASSIGNED
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {t.task_prompt}
                      </p>
                    </div>

                    {/* Output */}
                    {t.output && (
                      <div className="glass p-4 rounded-lg" style={{ borderColor: "var(--green-dim)" }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--green)" }}>
                          ✓ OUTPUT
                        </p>
                        <div
                          className="result-prose text-sm"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(t.output) }}
                        />
                      </div>
                    )}

                    {/* Error */}
                    {t.error && (
                      <div className="glass p-4 rounded-lg" style={{ borderColor: "var(--red-dim)" }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--red)" }}>
                          ✗ ERROR
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {t.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : agent.status === "idle" ? (
              <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                <p className="text-3xl mb-3">💤</p>
                <p className="text-sm">Waiting for a task</p>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                <p className="text-3xl mb-3">⚡</p>
                <p className="text-sm">Working on it…</p>
              </div>
            )}

            {/* Inline output if no DB record yet */}
            {!detail?.tasks?.length && agent.output && (
              <div className="glass p-4 rounded-lg" style={{ borderColor: "var(--green-dim)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--green)" }}>
                  ✓ OUTPUT
                </p>
                <div
                  className="result-prose text-sm"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(agent.output) }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    idle: "var(--text-muted)",
    working: "var(--green)",
    done: "var(--blue)",
    error: "var(--red)",
    synthesizing: "var(--purple)",
  };
  return map[s] ?? "var(--text-secondary)";
}
