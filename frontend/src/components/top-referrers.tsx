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

interface TopReferrersProps {
	agents: Agent[];
}

export function TopReferrers({ agents }: TopReferrersProps) {
	// Find agents that completed successfully, sort by duration ascending
	const completed = agents
		.filter(a => a.status === "done" && a.duration_ms)
		.map(a => ({
			name: a.name,
			department: a.department,
			duration: a.duration_ms ? a.duration_ms / 1000 : 0,
		}))
		.sort((a, b) => a.duration - b.duration)
		.slice(0, 5);

	const displayRows = completed.length > 0 ? completed : agents.slice(0, 5).map(a => ({
		name: a.name,
		department: a.department,
		duration: 0,
	}));

	return (
		<Card className="relative glass">
			<CardHeader>
				<CardTitle className="text-balance">Execution Speed Leaders</CardTitle>
				<CardDescription className="text-pretty">
					Completed agents ranked by their execution and API response latency.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4">
				<Table className="border-t border-border/10">
					<TableCaption className="sr-only">
						Fastest responding agents.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-6" scope="col">
								Agent
							</TableHead>
							<TableHead className="pr-6 text-end tabular-nums" scope="col">
								Latency
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{displayRows.map((row) => (
							<TableRow className="hover:bg-transparent" key={row.name}>
								<TableCell className="max-w-[220px] truncate pl-6 font-medium">
									<div className="flex flex-col">
										<span className="text-xs font-semibold text-primary">{row.name}</span>
										<span className="text-[10px] text-muted-foreground">{row.department}</span>
									</div>
								</TableCell>
								<TableCell className="pr-6 text-end text-muted-foreground text-xs tabular-nums font-semibold" style={{ color: row.duration > 0 ? "var(--blue)" : "inherit" }}>
									{row.duration > 0 ? `${row.duration.toFixed(1)}s` : "—"}
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
