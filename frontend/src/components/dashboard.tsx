import { AudienceMix } from "@/components/audience-mix";
import { BrowserShare } from "@/components/browser-share";
import { OnlineNow } from "@/components/online-now";
import { TopCountries } from "@/components/top-countries";
import { TopPages } from "@/components/top-pages";
import { TopReferrers } from "@/components/top-referrers";
import { TrafficSourcesChart } from "@/components/traffic-sources-chart";
import { VisitorsChart } from "@/components/visitors-chart";
import { WebVitals } from "@/components/web-vitals";
import type { Agent } from "@/components/AgentCard";
import type { AgentEvent } from "@/hooks/useWebSocket";

interface DashboardProps {
	agents: Agent[];
	events: AgentEvent[];
}

export function Dashboard({ agents, events }: DashboardProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<VisitorsChart agents={agents} events={events} />
			<OnlineNow agents={agents} />
			<TopPages agents={agents} />
			<TopCountries agents={agents} />
			<TrafficSourcesChart agents={agents} />
			<AudienceMix agents={agents} />
			<BrowserShare agents={agents} />
			<TopReferrers agents={agents} />
			<WebVitals agents={agents} />
		</div>
	);
}
