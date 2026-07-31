"use client";

import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { AppSearch } from "@/components/app-search";
import { navGroups } from "@/components/app-shared";
import { CustomTrigger } from "@/components/custom-trigger";
import { LatestChange } from "@/components/latest-change";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useEffect, useState } from "react";
import { SettingsIcon } from "lucide-react";

export function AppSidebar() {
	const [activeHash, setActiveHash] = useState("#control-room");

	useEffect(() => {
		const handleHashChange = () => {
			setActiveHash(window.location.hash || "#control-room");
		};
		window.addEventListener("hashchange", handleHashChange);
		handleHashChange(); // run initially
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-transparent *:data-[slot=sidebar-inner]:backdrop-blur-md *:data-[slot=sidebar-inner]:border-r *:data-[slot=sidebar-inner]:border-border/10",
				"transition-[left,right,top,width] group-data-[collapsible=icon]:top-[calc(var(--app-header-height)*0.5)]"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			<SidebarHeader className="h-(--app-header-height,3rem) flex-row items-center justify-between">
				<div className="flex items-center gap-2 px-2 py-1.5">
					<LogoIcon />
					<span className="font-bold tracking-wider text-sm" style={{ color: "var(--text-primary)" }}>
						AI COMPANY
					</span>
				</div>
				<CustomTrigger place="sidebar" />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<AppSearch />
				</SidebarGroup>
				{navGroups.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
							{group.label}
						</SidebarGroupLabel>
						<SidebarMenu>
							{group.items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										isActive={activeHash === item.path}
										tooltip={item.title}
										onClick={() => {
											if (item.path) {
												window.location.hash = item.path;
											}
										}}
									>
										{item.icon}
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarFooter className="px-4">
				<LatestChange />
				<div className="flex items-center pt-4 pb-2">
					<ThemeSwitcher />
					<Button className="text-muted-foreground" size="icon-sm" variant="ghost" render={<a aria-label="Settings" href="#" />} nativeButton={false}><SettingsIcon
                    							/></Button>
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
