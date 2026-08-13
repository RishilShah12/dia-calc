"use client";

import { Button } from "@dia-calc/ui/components/button";
import { Input } from "@dia-calc/ui/components/input";
import { Label } from "@dia-calc/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@dia-calc/ui/components/sheet";
import { Skeleton } from "@dia-calc/ui/components/skeleton";
import { cn } from "@dia-calc/ui/lib/utils";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";

const MONTHS = [
	"JAN",
	"FEB",
	"MAR",
	"APR",
	"MAY",
	"JUN",
	"JUL",
	"AUG",
	"SEP",
	"OCT",
	"NOV",
	"DEC",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatRapDate(iso: string): string {
	const match = ISO_DATE.exec(iso);
	if (!match) {
		return iso;
	}

	const monthIndex = Number(match[2]) - 1;
	const month = MONTHS[monthIndex];
	const day = Number(match[3]);
	if (!(month && day > 0)) {
		return iso;
	}

	return `${day} ${month}`;
}

function rapPillLabel(refreshing: boolean, listDate: string | null): string {
	if (refreshing) {
		return "…";
	}
	if (listDate) {
		return `RAP ${formatRapDate(listDate)}`;
	}
	return "RAP";
}

function AccountPanel({
	isPending,
	onSignOut,
	session,
}: {
	isPending: boolean;
	onSignOut: () => void;
	session: { user: { email: string; name: string } } | null | undefined;
}) {
	if (isPending) {
		return <Skeleton className="h-9 w-full" />;
	}
	if (!session) {
		return null;
	}
	return (
		<div className="flex flex-col gap-2">
			<p className="truncate text-sm">{session.user.name}</p>
			<p className="truncate text-muted-foreground text-xs">
				{session.user.email}
			</p>
			<Button onClick={onSignOut} variant="destructive">
				Sign out
			</Button>
		</div>
	);
}

interface Props {
	listDate: string | null;
	onRateChange: (value: string) => void;
	onRefresh: () => void;
	placeholderRate: string;
	rateText: string;
	refreshing: boolean;
}

export default function CalcHeader({
	listDate,
	onRateChange,
	onRefresh,
	placeholderRate,
	rateText,
	refreshing,
}: Props) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	const handleRate = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			onRateChange(event.target.value);
		},
		[onRateChange]
	);

	const handleSignOut = useCallback(() => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/");
				},
			},
		});
	}, [router]);

	const refreshLabel = listDate
		? `Refresh Rapaport list from ${formatRapDate(listDate)}`
		: "Refresh Rapaport list";

	return (
		<header className="flex items-center gap-2 px-3 py-2">
			<Sheet>
				<SheetTrigger
					render={
						<Button
							aria-label="Open menu"
							className="rounded-calc"
							size="icon"
							variant="ghost"
						/>
					}
				>
					<Menu />
				</SheetTrigger>
				<SheetContent side="left">
					<SheetHeader>
						<SheetTitle>EZCalc</SheetTitle>
						<SheetDescription>Account, theme, and FX rate.</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col gap-5 px-4">
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground text-xs">Theme</span>
							<ModeToggle />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="usd-inr">USD → INR</Label>
							<Input
								id="usd-inr"
								inputMode="decimal"
								onChange={handleRate}
								placeholder={placeholderRate}
								value={rateText}
							/>
						</div>
					</div>
					<SheetFooter>
						<AccountPanel
							isPending={isPending}
							onSignOut={handleSignOut}
							session={session}
						/>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<h1 className="flex-1 text-center font-semibold text-sm tracking-[0.18em]">
				EZCalc
			</h1>

			<Button
				aria-label={refreshLabel}
				className={cn(
					"rounded-calc px-3 font-medium text-[11px] tabular-nums",
					"bg-calc-total/15 text-calc-total hover:bg-calc-total/25"
				)}
				disabled={refreshing}
				onClick={onRefresh}
				size="sm"
				variant="ghost"
			>
				{rapPillLabel(refreshing, listDate)}
			</Button>
		</header>
	);
}
