"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ShareBarList,
	ShareBarListContent,
	ShareBarListFill,
	ShareBarListItem,
	ShareBarListLabel,
	ShareBarListValue,
} from "@/components/share-bar-list";
import type { Agent } from "@/components/AgentCard";

interface OnlineNowProps {
	agents: Agent[];
}

export function OnlineNow({ agents }: OnlineNowProps) {
	const working = agents.filter(a => ["working", "synthesizing"].includes(a.status)).length;
	const done = agents.filter(a => a.status === "done").length;
	const active = working + done;

	// Calculate share by level
	const csuite = agents.filter(a => a.id <= 5 && ["working", "synthesizing", "done"].includes(a.status));
	const vps = agents.filter(a => a.id > 5 && a.id <= 12 && ["working", "synthesizing", "done"].includes(a.status));
	const workers = agents.filter(a => a.id > 12 && ["working", "synthesizing", "done"].includes(a.status));

	const totalActive = csuite.length + vps.length + workers.length;

	const shares = [
		{
			label: "C-Suite",
			share: totalActive > 0 ? Math.round((csuite.length / totalActive) * 100) : 0,
		},
		{
			label: "VPs / Directors",
			share: totalActive > 0 ? Math.round((vps.length / totalActive) * 100) : 0,
		},
		{
			label: "Specialists",
			share: totalActive > 0 ? Math.round((workers.length / totalActive) * 100) : 0,
		},
	];

	return (
		<Card className="gap-0 pb-0 md:col-span-2 lg:col-span-1 glass">
			<CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/10">
				<div className="flex min-w-0 flex-col gap-0">
					<CardTitle className="font-mono text-2xl tabular-nums">
						{working}
					</CardTitle>
					<CardDescription className="flex items-center gap-1.5 mt-1">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										className={cn(
											"cursor-help px-1 py-px font-normal text-muted-foreground flex items-center gap-1.5",
											"hover:underline-0"
										)}
										type="button"
										variant="link"
									/>
								}
							>
								<span className={cn("dot", working > 0 ? "dot-working" : "dot-idle")} style={{ width: 6, height: 6 }} />
								<span>agents active now</span>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Agents currently invoking the LLM API.
							</TooltipContent>
						</Tooltip>
					</CardDescription>
				</div>
				<div className="glass px-2 py-0.5 rounded text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
					{done}/{agents.length || 100} done
				</div>
			</CardHeader>
			<CardContent
				className={cn("relative flex h-full items-center px-0 py-2")}
			>
				<ShareBarList>
					{shares.map((d) => (
						<ShareBarListItem key={d.label} value={d.share}>
							<ShareBarListContent>
								<ShareBarListLabel>{d.label}</ShareBarListLabel>
								<ShareBarListValue>{d.share}%</ShareBarListValue>
							</ShareBarListContent>
							<ShareBarListFill data-online-bar />
						</ShareBarListItem>
					))}
				</ShareBarList>
			</CardContent>
		</Card>
	);
}
