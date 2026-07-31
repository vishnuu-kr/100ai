"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import type { Agent } from "@/components/AgentCard";
import type { AgentEvent } from "@/hooks/useWebSocket";

interface VisitorsChartProps {
	agents: Agent[];
	events: AgentEvent[];
}

const chartConfig = {
	completed: {
		label: "Completed Tasks",
		color: "var(--blue)",
	},
} satisfies ChartConfig;

export function VisitorsChart({ agents, events }: VisitorsChartProps) {
	const gradientId = `completed-area-${useId().replace(/:/g, "")}`;

	// Extract completed task events over time
	const doneEvents = events
		.filter(e => e.type === "agent_done")
		.sort((a, b) => a.timestamp - b.timestamp);

	// Map to chart data
	let cumulative = 0;
	const chartData = doneEvents.map((e, index) => {
		cumulative += 1;
		const timeStr = new Date(e.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		return {
			time: timeStr,
			completed: cumulative,
		};
	});

	// If no events yet, show placeholder/startup progress timeline
	const displayData = chartData.length > 0 ? chartData : [
		{ time: "0s", completed: 0 },
		{ time: "2s", completed: 0 },
		{ time: "4s", completed: 0 },
		{ time: "6s", completed: 0 },
		{ time: "8s", completed: 0 },
		{ time: "10s", completed: 0 },
	];

	const doneCount = agents.filter(a => a.status === "done").length;
	const errorCount = agents.filter(a => a.status === "error").length;
	const pct = agents.length > 0 ? ((doneCount + errorCount) / agents.length) * 100 : 0;

	return (
		<Card className="md:col-span-2 lg:col-span-3 glass">
			<CardHeader className="flex flex-row items-start justify-between">
				<div className="flex flex-col gap-1.5">
					<CardTitle className="font-mono text-2xl tabular-nums">
						{doneCount}
					</CardTitle>
					<CardDescription className="text-pretty">
						Total tasks completed concurrently in the current workspace run.
					</CardDescription>
				</div>
				<Delta value={pct} variant="badge">
					<DeltaIcon variant="trend" />
					<DeltaValue suffix="%" />
					<span>completion rate</span>
				</Delta>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className="aspect-auto h-60 w-full"
					config={chartConfig}
				>
					<AreaChart
						accessibilityLayer
						data={displayData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<defs>
							<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
								<stop
									offset="0%"
									stopColor="var(--blue)"
									stopOpacity={0.35}
								/>
								<stop
									offset="100%"
									stopColor="var(--blue)"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="time"
							tickLine={false}
							tickMargin={8}
							tickFormatter={(val) => val}
						/>
						<ChartTooltip
							content={<ChartTooltipContent indicator="dashed" />}
							cursor={{
								stroke: "var(--blue)",
								strokeDasharray: "3 3",
								strokeLinecap: "round",
							}}
							wrapperStyle={{ outline: "none" }}
						/>
						<Area
							dataKey="completed"
							dot={{
								fill: "var(--blue)",
								r: 2.5,
								strokeWidth: 2,
							}}
							fill={`url(#${gradientId})`}
							isAnimationActive={false}
							name={chartConfig.completed.label}
							stroke="var(--blue)"
							strokeWidth={2}
							type="monotone"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
