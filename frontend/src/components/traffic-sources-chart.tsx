"use client";

import { formatCompactNumber } from "@/components/formater";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ShareBarList,
	ShareBarListContent,
	ShareBarListFill,
	ShareBarListItem,
	ShareBarListLabel,
	ShareBarListValue,
} from "@/components/share-bar-list";
import type { Agent } from "@/components/AgentCard";

interface TrafficSourcesChartProps {
	agents: Agent[];
}

export function TrafficSourcesChart({ agents }: TrafficSourcesChartProps) {
	// Count active/done tasks per department
	const deptCounts: Record<string, number> = {};
	for (const a of agents) {
		if (["working", "synthesizing", "done"].includes(a.status)) {
			deptCounts[a.department] = (deptCounts[a.department] || 0) + 1;
		}
	}

	// Always ensure we have some data
	const chartData = Object.entries(deptCounts).map(([source, sessions]) => ({
		source,
		sessions,
	})).sort((a, b) => b.sessions - a.sessions);

	const maxSessions = chartData.length > 0 ? Math.max(...chartData.map((d) => d.sessions)) : 1;

	function barWidthPercent(sessions: number) {
		if (maxSessions <= 0) return 0;
		return (sessions / maxSessions) * 100;
	}

	return (
		<Card className="glass">
			<CardHeader className="border-b border-border/10">
				<CardTitle className="text-balance">Active Tasks by Department</CardTitle>
				<CardDescription className="text-pretty">
					Volume of tasks being actively executed or successfully completed.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0 py-1">
				{chartData.length === 0 ? (
					<div className="text-center py-10 text-xs text-muted-foreground">
						No active tasks yet. Submit a goal to see data.
					</div>
				) : (
					<ShareBarList aria-label="Tasks by department">
						{chartData.map((row) => (
							<ShareBarListItem
								key={row.source}
								value={barWidthPercent(row.sessions)}
							>
								<ShareBarListContent>
									<ShareBarListLabel>{row.source}</ShareBarListLabel>
									<ShareBarListValue>
										{formatCompactNumber(row.sessions)}
									</ShareBarListValue>
								</ShareBarListContent>
								<ShareBarListFill />
							</ShareBarListItem>
						))}
					</ShareBarList>
				)}
			</CardContent>
		</Card>
	);
}
