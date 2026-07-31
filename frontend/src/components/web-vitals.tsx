"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import type { Agent } from "@/components/AgentCard";

interface WebVitalsProps {
	agents: Agent[];
}

export function WebVitals({ agents }: WebVitalsProps) {
	const completed = agents.filter(a => a.status === "done" && a.duration_ms);
	const errors = agents.filter(a => a.status === "error").length;

	const maxDuration = completed.length > 0
		? Math.max(...completed.map(a => a.duration_ms || 0)) / 1000
		: 0;

	const avgDuration = completed.length > 0
		? (completed.reduce((acc, a) => acc + (a.duration_ms || 0), 0) / completed.length) / 1000
		: 0;

	const errorRate = agents.length > 0
		? (errors / agents.length) * 100
		: 0;

	const vitals = [
		{
			label: "MAX LATENCY",
			name: "Longest agent response time",
			value: maxDuration > 0 ? `${maxDuration.toFixed(1)}s` : "0.0s",
			delta: maxDuration,
			deltaLabel: "seconds maximum limit",
			suffix: "s",
		},
		{
			label: "AVG LATENCY",
			name: "Average request response time",
			value: avgDuration > 0 ? `${avgDuration.toFixed(1)}s` : "0.0s",
			delta: avgDuration,
			deltaLabel: "seconds average limit",
			suffix: "s",
		},
		{
			label: "ERROR RATE",
			name: "Agent failure rate",
			value: `${errorRate.toFixed(1)}%`,
			delta: errorRate,
			deltaLabel: "percent failures",
			suffix: "%",
		},
	];

	return (
		<Card className="md:col-span-2 lg:col-span-4 glass">
			<CardHeader className="border-b border-border/10">
				<CardTitle className="text-balance">Agent Performance Metrics</CardTitle>
				<CardDescription className="text-pretty">
					Core performance indicators for LLM invocations and success rate in the active run.
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-6">
				<ul className="grid gap-6 sm:grid-cols-3">
					{vitals.map((v) => (
						<li className="flex flex-col gap-1" key={v.label}>
							<p className="text-pretty font-semibold text-sm tracking-wider" style={{ color: "var(--text-muted)" }}>
								{v.label}
							</p>
							<p className="text-pretty text-muted-foreground text-xs">
								{v.name}
							</p>
							<p className="text-balance font-bold text-3xl tabular-nums mt-1" style={{ color: "var(--text-primary)" }}>
								{v.value}
							</p>
							<div className="flex items-center gap-1.5 text-pretty text-muted-foreground text-xs mt-1">
								<Delta value={v.delta > 0 ? -1.2 : 0} variant="default">
									<DeltaIcon />
									<DeltaValue suffix={v.suffix} />
								</Delta>
								<span>{v.deltaLabel}</span>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
