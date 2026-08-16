"use client";

import { formatRapDate } from "@dia-calc/calc/rap-calc";
import { Button } from "@dia-calc/ui/components/button";
import { Input } from "@dia-calc/ui/components/input";
import { Label } from "@dia-calc/ui/components/label";
import { Separator } from "@dia-calc/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@dia-calc/ui/components/sheet";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@dia-calc/ui/components/sidebar";
import { Skeleton } from "@dia-calc/ui/components/skeleton";
import { Spinner } from "@dia-calc/ui/components/spinner";
import { cn } from "@dia-calc/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CircleUser, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { usePriceList } from "@/hooks/use-price-list";
import { authClient } from "@/lib/auth-client";
import { fxQueryOptions } from "@/lib/fx";
import { useRate } from "@/lib/rate";

/**
 * Everything that is about the dealer rather than the stone: who is signed in,
 * how old the price list is, and the rate they convert at. Native puts this in a
 * sheet off the toolbar; here it hangs off the bottom of the sidebar, which is
 * where a desktop expects to find an account.
 */

export default function AccountPanel() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const { failed, listDate, refresh, refreshing } = usePriceList();
	const fx = useQuery(fxQueryOptions);
	const { rateText, setRateText } = useRate();

	const handleRate = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => setRateText(event.target.value),
		[setRateText]
	);
	const handleRefresh = useCallback(() => refresh(), [refresh]);
	const handleSignOut = useCallback(() => {
		authClient.signOut({
			fetchOptions: { onSuccess: () => router.push("/login") },
		});
	}, [router]);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<Sheet>
					<SheetTrigger
						render={<SidebarMenuButton tooltip="Account" />}
						// The trigger has to be the menu button itself, or the rail
						// collapses to a glyph with nothing clickable in it.
					>
						<CircleUser />
						<span className="flex-1 truncate">
							{session?.user.name ?? "Account"}
						</span>
						<span
							className={cn(
								"font-medium text-[11px] tabular-nums",
								failed ? "text-destructive" : "text-calc-accent"
							)}
						>
							{failed ? "NO LIST" : formatRapDate(listDate)}
						</span>
					</SheetTrigger>

					<SheetContent side="left">
						<SheetHeader>
							<SheetTitle>Account</SheetTitle>
							<SheetDescription>
								The price list, the rate, and who you are signed in as.
							</SheetDescription>
						</SheetHeader>

						<div className="flex flex-col gap-5 px-4">
							{isPending ? (
								<Skeleton className="h-9 w-full" />
							) : (
								<div className="flex flex-col gap-1">
									<p className="truncate text-sm">{session?.user.name}</p>
									<p className="truncate text-muted-foreground text-xs">
										{session?.user.email}
									</p>
								</div>
							)}

							<Separator />

							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col gap-0.5">
									<span className="text-muted-foreground text-xs">
										Rapaport list
									</span>
									<span
										className={cn(
											"font-semibold text-sm tabular-nums",
											failed && "text-destructive"
										)}
									>
										{failed ? "NO LIST" : formatRapDate(listDate)}
									</span>
								</div>
								<Button
									disabled={refreshing}
									onClick={handleRefresh}
									variant="outline"
								>
									{refreshing ? (
										<Spinner data-icon="inline-start" />
									) : (
										<RefreshCw data-icon="inline-start" />
									)}
									Refresh
								</Button>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="usd-inr">USD → INR</Label>
								<Input
									id="usd-inr"
									inputMode="decimal"
									onChange={handleRate}
									placeholder={fx.data ? fx.data.inr.toFixed(2) : "—"}
									value={rateText}
								/>
							</div>

							<div className="flex items-center justify-between gap-3">
								<span className="text-muted-foreground text-xs">Theme</span>
								<ModeToggle />
							</div>

							<Separator />

							<Button onClick={handleSignOut} variant="destructive">
								Sign out
							</Button>
						</div>
					</SheetContent>
				</Sheet>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
