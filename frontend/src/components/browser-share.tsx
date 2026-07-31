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

interface BrowserShareProps {
	agents: Agent[];
}

export function BrowserShare({ agents }: BrowserShareProps) {
	const total = agents.length || 100;
	
	// Key status counts based on key_status field on agents
	const idle = agents.filter(a => a.key_status === "idle" || !a.key_status).length;
	const busy = agents.filter(a => a.key_status === "busy" || a.status === "working" || a.status === "synthesizing").length;
	const rateLimited = agents.filter(a => a.key_status === "rate_limited").length;
	const expired = agents.filter(a => a.key_status === "expired" || a.key_status === "error").length;

	const keysData = [
		{ label: "Idle / Available", share: Math.round((idle / total) * 100) },
		{ label: "Active In-Use", share: Math.round((busy / total) * 100) },
		{ label: "Rate Limited", share: Math.round((rateLimited / total) * 100) },
		{ label: "Error / Expired", share: Math.round((expired / total) * 100) },
	];

	return (
		<Card className="glass">
			<CardHeader className="border-b border-border/10">
				<CardTitle className="text-balance">Key Manager Health</CardTitle>
				<CardDescription className="text-pretty">
					Real-time status of the 100 API keys mapped to the workspace.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4 py-2">
				<ShareBarList aria-label="API Key health breakdown">
					{keysData.map((row) => (
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
