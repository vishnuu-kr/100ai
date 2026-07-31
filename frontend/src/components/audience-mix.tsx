"use client";

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

interface AudienceMixProps {
	agents: Agent[];
}

export function AudienceMix({ agents }: AudienceMixProps) {
	const total = agents.length || 100;
	const idle = agents.filter(a => a.status === "idle").length;
	const working = agents.filter(a => ["working", "synthesizing"].includes(a.status)).length;
	const done = agents.filter(a => a.status === "done").length;
	const error = agents.filter(a => a.status === "error").length;

	const segments = [
		{ label: "Completed", share: Math.round((done / total) * 100) },
		{ label: "Active Working", share: Math.round((working / total) * 100) },
		{ label: "Errors Encountered", share: Math.round((error / total) * 100) },
		{ label: "Remaining Idle", share: Math.round((idle / total) * 100) },
	];

	return (
		<Card className="glass">
			<CardHeader className="border-b border-border/10">
				<CardTitle className="text-balance">Agent State Mix</CardTitle>
				<CardDescription className="text-pretty">
					Split of all 100 agents by their active status in this run.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4 py-2">
				<ShareBarList aria-label="Agent states share">
					{segments.map((row) => (
						<ShareBarListItem key={row.label} value={row.share}>
							<ShareBarListContent>
								<ShareBarListLabel>{row.label}</ShareBarListLabel>
								<ShareBarListValue>{row.share}%</ShareBarListValue>
							</ShareBarListContent>
							<ShareBarListFill />
						</ShareBarListItem>
					))}
				</ShareBarList>
			</CardContent>
		</Card>
	);
}
