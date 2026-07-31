"use client";

import { useEffect, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { navLinks } from "@/components/app-shared";
import { CustomTrigger } from "@/components/custom-trigger";
import { NavUser } from "@/components/nav-user";
import { HelpCircleIcon, BellIcon } from "lucide-react";

export function AppHeader() {
	const [activeHash, setActiveHash] = useState("#control-room");

	useEffect(() => {
		const handleHashChange = () => {
			setActiveHash(window.location.hash || "#control-room");
		};
		window.addEventListener("hashchange", handleHashChange);
		handleHashChange();
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const activeItem = navLinks.find((item) => item.path === activeHash);

	return (
		<header className="sticky top-0 z-50 flex h-(--app-header-height) w-full shrink-0 items-center justify-between gap-2 border-b border-border/10 bg-background/5 backdrop-blur-md px-4 md:px-6">
			<div className="flex items-center gap-3">
				<CustomTrigger place="navbar" />
			</div>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbPage>{activeItem?.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>{" "}
			<div className="flex items-center gap-3">
				<Button size="icon-sm" variant="outline">
					<HelpCircleIcon
					/>
				</Button>
				<Button aria-label="Notifications" size="icon-sm" variant="outline">
					<BellIcon
					/>
				</Button>
				<Separator
					className="h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
		</header>
	);
}
