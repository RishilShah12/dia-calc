import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@dia-calc/ui/components/sidebar";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import AppSidebar from "@/components/calc/app-sidebar";
import { authClient } from "@/lib/auth-client";

/**
 * The signed-in shell: one gate for all three screens, and the sidebar that
 * stands in for the native drawer.
 *
 * `/login` deliberately sits outside this group — it has no `(calc)` ancestor,
 * so it gets neither the chrome nor the redirect that would otherwise loop it
 * back into itself.
 *
 * Gated twice: here, and by `protectedProcedure` on the RPC itself. The Rapaport
 * list is copyrighted and subscriber-only, so it must never reach an anonymous
 * request.
 */
export default async function CalcLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	// Read on the server so a collapsed rail is collapsed in the first paint
	// rather than snapping shut once the client picks the cookie up.
	const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<AppSidebar />
			<SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
				{/* The only chrome outside the sidebar: on a phone the rail is gone,
				    so this is the handle that brings it back. */}
				<div className="flex shrink-0 items-center gap-2 px-2 py-1.5">
					<SidebarTrigger />
				</div>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
