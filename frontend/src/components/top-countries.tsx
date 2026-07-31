"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ArrowRightIcon } from "lucide-react";
import type { Agent } from "@/components/AgentCard";

interface TopCountriesProps {
	agents: Agent[];
}

const DEPT_ICONS: Record<string, string> = {
	Executive: "👑", Research: "🔬", Engineering: "⚙️",
	Marketing: "📣", QA: "🧪", Data: "📊", Strategy: "♟️", Operations: "🏗️"
};

export function TopCountries({ agents }: TopCountriesProps) {
	// Group agents by department and count done vs total
	const deptStats: Record<string, { done: number; total: number; errors: number }> = {};
	for (const a of agents) {
		deptStats[a.department] = deptStats[a.department] || { done: 0, total: 0, errors: 0 };
		deptStats[a.department].total += 1;
		if (a.status === "done") deptStats[a.department].done += 1;
		if (a.status === "error") deptStats[a.department].errors += 1;
	}

	const rows = Object.entries(deptStats).map(([name, stats]) => {
		const completedRatio = `${stats.done}/${stats.total}`;
		const successRate = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
		return {
			name,
			icon: DEPT_ICONS[name] || "📁",
			completedRatio,
			successRate,
		};
	}).sort((a, b) => b.successRate - a.successRate);

	return (
		<Card className="relative md:col-span-2 glass">
			<CardHeader>
				<CardTitle className="text-balance">Department Progress</CardTitle>
				<CardDescription className="text-pretty">
					Real-time task completion ratios and success rates across all 8 organizational units.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4">
				<Table className="border-t border-border/10">
					<TableCaption className="sr-only">
						Department completion statistics.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-6" scope="col">
								Department
							</TableHead>
							<TableHead className="text-end" scope="col">
								Completion
							</TableHead>
							<TableHead className="pr-6 text-end" scope="col">
								Success Rate
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow className="hover:bg-transparent" key={row.name}>
								<TableCell className="max-w-[220px] truncate pl-6 font-medium text-xs">
									<span className="inline-flex max-w-full items-center gap-2">
										<span className="text-sm shrink-0">{row.icon}</span>
										<span className="min-w-0 truncate text-xs">
											{row.name}
										</span>
									</span>
								</TableCell>
								<TableCell className="text-end text-muted-foreground text-xs tabular-nums">
									{row.completedRatio}
								</TableCell>
								<TableCell className="pr-6 text-end text-muted-foreground text-xs">
									<span className="tabular-nums font-semibold" style={{ color: row.successRate > 0 ? "var(--green)" : "inherit" }}>
										{row.successRate.toFixed(0)}%
									</span>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>

			<div className="mask-t-from-30% absolute inset-x-0 bottom-0 flex h-1/5 items-center justify-center bg-background/90">
				<Button className="relative" variant="ghost" render={<a href="#control-room" />} nativeButton={false}>
					View Control Room
					<ArrowRightIcon aria-hidden="true" />
				</Button>
			</div>
		</Card>
	);
}
