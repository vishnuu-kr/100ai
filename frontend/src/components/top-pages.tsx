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

interface TopPagesProps {
	agents: Agent[];
}

export function TopPages({ agents }: TopPagesProps) {
	// Find agents that are completed and sort by output size descending
	const contributors = agents
		.filter(a => a.status === "done" && a.output)
		.map(a => ({
			name: a.name,
			role: a.role,
			outputSize: a.output ? a.output.length : 0,
			duration: a.duration_ms ? a.duration_ms / 1000 : 0,
		}))
		.sort((a, b) => b.outputSize - a.outputSize)
		.slice(0, 5);

	// Fallback to top C-suite/VPs if no output yet
	const displayRows = contributors.length > 0 ? contributors : agents.slice(0, 5).map(a => ({
		name: a.name,
		role: a.role,
		outputSize: 0,
		duration: 0,
	}));

	return (
		<Card className="relative md:col-span-2 glass">
			<CardHeader>
				<CardTitle className="text-balance">Top Contributing Agents</CardTitle>
				<CardDescription className="text-pretty">
					Agents producing the most extensive research and deliverables in the active run.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4">
				<Table className="border-t border-border/10">
					<TableCaption className="sr-only">
						Top contributing agents by output characters.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-6" scope="col">
								Agent
							</TableHead>
							<TableHead className="text-end" scope="col">
								Output Size
							</TableHead>
							<TableHead className="pr-6 text-end" scope="col">
								Time Taken
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{displayRows.map((row) => (
							<TableRow className="hover:bg-transparent" key={row.name}>
								<TableCell className="max-w-[200px] truncate pl-6 font-medium">
									<div className="flex flex-col">
										<span className="text-xs font-semibold text-primary">{row.name}</span>
										<span className="text-[10px] text-muted-foreground truncate">{row.role}</span>
									</div>
								</TableCell>
								<TableCell className="text-end text-muted-foreground text-xs tabular-nums">
									{row.outputSize > 0 ? `${row.outputSize.toLocaleString()} chars` : "—"}
								</TableCell>
								<TableCell className="pr-6 text-end text-muted-foreground text-xs">
									<span className="tabular-nums">
										{row.duration > 0 ? `${row.duration.toFixed(1)}s` : "—"}
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
