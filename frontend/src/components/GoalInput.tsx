"use client";

import React, { useState } from "react";
import { Globe, Sparkles, ArrowRight } from "lucide-react";

interface GoalInputProps {
  onSubmit: (goal: string) => void;
  isRunning: boolean;
}

const WEBSITE_EXAMPLES = [
  { label: "https://cursor.com", desc: "AI Code Editor" },
  { label: "https://v0.dev", desc: "AI UI Generator" },
  { label: "https://linear.app", desc: "Modern Issue Tracking" },
  { label: "https://agenttag.me", desc: "Agent Identity Platform" },
];

export function GoalInput({ onSubmit, isRunning }: GoalInputProps) {
  const [goal, setGoal] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = goal.trim();
    if (!trimmed || isRunning) return;
    const clean = trimmed.slice(0, 3000);
    onSubmit(clean);
  };

  return (
    <div className="goal-input-wrap glass" style={{ padding: "18px 20px", borderRadius: 14, marginBottom: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--blue)" }}>
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            TARGET WEBSITE & MARKETING MISSION (SANDBOX)
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            100 Agents Live Scraping & Research
          </span>
        </div>

        <div className="flex gap-3 items-end">
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Paste website URL (e.g. https://myproduct.com) or enter a target marketing mission... The 100 agents will scrape the site and analyze X, Reddit, HN, PH, & search engines in real-time."
              disabled={isRunning}
              rows={2}
              style={{
                width: "100%", background: "rgba(0,0,0,0.25)", resize: "none",
                outline: "none", border: focused ? "1px solid var(--blue)" : "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px",
                color: "var(--text-primary)", caretColor: "var(--blue)",
                fontSize: 13, lineHeight: 1.6,
                fontFamily: "inherit", transition: "all 0.2s"
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!goal.trim() || isRunning}
            style={{
              background: isRunning
                ? "var(--border)"
                : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              color: "white", border: "none", borderRadius: 10,
              padding: "12px 22px", fontSize: 13, fontWeight: 700,
              cursor: isRunning || !goal.trim() ? "not-allowed" : "pointer",
              opacity: !goal.trim() ? 0.5 : 1,
              transition: "all 0.2s", whiteSpace: "nowrap",
              letterSpacing: "0.03em", alignSelf: "stretch",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: isRunning ? "none" : "0 4px 20px rgba(37,99,235,0.35)",
            }}
          >
            {isRunning ? (
              <>
                <span className="dot dot-working" style={{ width: 8, height: 8 }} />
                <span>Scraping & Analyzing…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scrape & Market Site</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Website Presets */}
        {!isRunning && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
              Try Demo Websites:
            </span>
            {WEBSITE_EXAMPLES.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGoal(`Scrape and market this website: ${item.label} (${item.desc})`)}
                style={{
                  background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "4px 10px", fontSize: 11, cursor: "pointer",
                  transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.1)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <span style={{ fontWeight: 600, color: "#60a5fa" }}>{item.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>— {item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
