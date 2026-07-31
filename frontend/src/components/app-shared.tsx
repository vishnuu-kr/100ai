import type { ReactNode } from "react";
import { LayoutDashboardIcon, LineChartIcon, KeyIcon, DatabaseIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Workspace",
		items: [
			{
				title: "Control Room",
				path: "#control-room",
				icon: (
					<LayoutDashboardIcon
					/>
				),
				isActive: true,
			},
			{
				title: "Analytics",
				path: "#analytics",
				icon: (
					<LineChartIcon
					/>
				),
			},
			{
				title: "Key Manager",
				path: "#keys",
				icon: (
					<KeyIcon
					/>
				),
			},
			{
				title: "Run Logs",
				path: "#logs",
				icon: (
					<DatabaseIcon
					/>
				),
			},
		],
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
];
