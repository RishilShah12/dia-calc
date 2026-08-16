"use client";

import { toggleGuides, useGuides } from "@dia-calc/calc/guides";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@dia-calc/ui/components/sidebar";
import { Switch } from "@dia-calc/ui/components/switch";
import { Box, Eye, Gem, type LucideIcon, Table2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import AccountPanel from "./account-panel";

/**
 * The web stand-in for the native drawer, destination for destination.
 *
 * `collapsible="icon"` is doing double duty: on a desktop it shrinks to a rail
 * of glyphs, and below the mobile breakpoint the shadcn sidebar renders itself
 * as a sheet — which is the drawer the phones already have.
 */

/**
 * `href` is annotated rather than inferred: `typedRoutes` resolves `Link`'s
 * route generic per call site, and handing it a union of three literals infers
 * the union itself, which then satisfies none of its own members.
 */
const DESTINATIONS: { href: Route; icon: LucideIcon; label: string }[] = [
	{ href: "/", icon: Gem, label: "Polish" },
	{ href: "/rough", icon: Box, label: "Rough" },
	{ href: "/rap", icon: Table2, label: "Rap List" },
];

export default function AppSidebar() {
	const pathname = usePathname();
	const guides = useGuides();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex h-8 items-center px-2 font-semibold text-sm tracking-[0.18em] group-data-[collapsible=icon]:hidden">
					EZCALC
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{DESTINATIONS.map((destination) => (
								<SidebarMenuItem key={destination.href}>
									<SidebarMenuButton
										isActive={pathname === destination.href}
										render={<Link href={destination.href} />}
										tooltip={destination.label}
									>
										<destination.icon />
										<span>{destination.label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{/* Guides is a setting, not a destination — so it gets the
							    control a setting gets, and the label stays the noun. A
							    button reading "Guides off" has to say the state and the
							    action in one line. */}
							<SidebarMenuItem>
								<SidebarMenuButton
									onClick={toggleGuides}
									tooltip="Guides"
									// The row is the switch's label, so the switch itself is
									// decorative here and must not take a second tab stop.
								>
									<Eye />
									<span className="flex-1">Guides</span>
									<Switch
										aria-hidden
										checked={guides}
										className="pointer-events-none"
										tabIndex={-1}
									/>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<AccountPanel />
			</SidebarFooter>
		</Sidebar>
	);
}
