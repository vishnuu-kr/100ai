import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider
			className={cn(
				"[--app-wrapper-max-width:100%]",
				"[--app-header-height:3.5rem]"
			)}
		>
			<AppSidebar />
			<SidebarInset className="bg-transparent min-h-screen w-full flex-1">
				<AppHeader />
				<div
					className={cn(
						"flex flex-1 flex-col p-4 md:p-6",
						"w-full max-w-full"
					)}
				>
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
