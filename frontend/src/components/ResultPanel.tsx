"use client";

import React from "react";

interface ResultPanelProps {
  output: string | null;
  isRunning: boolean;
  agentsWorking: number;
  agentsDone: number;
  agentsError: number;
  totalAgents: number;
  contributors: number;
  phase: number;
  phaseLabel: string;
}

import { parseMarkdown } from "@/lib/markdown";

export function ResultPanel({
  output, isRunning, agentsWorking, agentsDone, agentsError,
  totalAgents, contributors, phase, phaseLabel,
}: ResultPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const pct = totalAgents > 0 ? Math.round((agentsDone / totalAgents) * 100) : 0;

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Idle state
  if (!isRunning && !output) {
    return (
      <div className="glass flex flex-col items-center justify-center" style={{ minHeight: 220, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
        <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          100 agents ready
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, maxWidth: 240 }}>
          Enter a goal above. Every specialist will work concurrently on their piece.
        </p>
      </div>
    );
  }

  // Running
  if (isRunning && !output) {
    const PHASES = [
      "",
      "Executive Strategy Briefing",
      "VP Task Delegation",
      "Specialist Execution",
      "Department Synthesis",
      "CEO Synthesis",
    ];
    return (
      <div className="glass" style={{ padding: 20 }}>
        {/* Phase indicators */}
        <div className="flex flex-col gap-1.5 mb-4">
          {[1,2,3,4,5].map(p => (
            <div key={p} className={`phase-badge ${phase > p ? "done" : phase === p ? "active" : "pending"}`}>
              {phase > p ? "✓" : p}. {PHASES[p]}
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {agentsWorking > 0
                ? `${agentsWorking} agents working`
                : agentsDone > 0
                ? "Agents finishing…"
                : "Starting…"}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {agentsDone + agentsError}/{totalAgents}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 5 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Live stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Working", value: agentsWorking, color: "var(--green)" },
            { label: "Done", value: agentsDone, color: "var(--blue)" },
            { label: "Error", value: agentsError, color: "var(--red)" },
          ].map(s => (
            <div key={s.label} className="glass text-center" style={{ padding: "10px 8px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {phaseLabel && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, textAlign: "center" }}>
            {phaseLabel}
          </p>
        )}
      </div>
    );
  }

  // Result ready
  return (
    <div className="result-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
      <div className="flex items-center justify-between mb-3" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🏆</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Final Report
          </span>
          {contributors > 0 && (
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 10,
              background: "var(--green-glow)", color: "var(--green)",
              border: "1px solid var(--green)", fontWeight: 600,
            }}>
              {contributors} agents contributed
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 8,
            background: copied ? "var(--green-glow)" : "var(--bg-card)",
            color: copied ? "var(--green)" : "var(--text-secondary)",
            border: `1px solid ${copied ? "var(--green)" : "var(--border-bright)"}`,
            cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div
        className="result-prose"
        dangerouslySetInnerHTML={{ __html: `<div>${parseMarkdown(output || "")}</div>` }}
      />
    </div>
  );
}
