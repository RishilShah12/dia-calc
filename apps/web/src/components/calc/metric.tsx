"use client";

import { cn } from "@dia-calc/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * The card vocabulary both calculators are built from: a caption over a number,
 * with a reserved line under it for the recut comparison.
 *
 * Ported from `calc-kit`'s `Caption` / `Metric` / `Caret` rather than reinvented,
 * so the web cards read at the same rhythm as the SwiftUI and Compose ones.
 */

/** Marks the field the keypad is currently typing into. */
export function Caret({ on }: { on: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-block w-[3px] shrink-0 rounded-full bg-calc-accent transition-opacity",
				on ? "opacity-100" : "opacity-0"
			)}
			// Cut to roughly the cap height of the numeral beside it, so the bar
			// stands exactly as tall as the digits rather than as their whole box.
			style={{ height: "0.72em" }}
		/>
	);
}

export function Caption({
	active,
	children,
	tone,
}: {
	active?: boolean;
	children: ReactNode;
	/** Accent while recut is on: the stone being priced changed, not one wheel. */
	tone?: "accent";
}) {
	return (
		<span
			className={cn(
				"text-[10px] uppercase tracking-widest",
				active || tone === "accent"
					? "text-calc-accent"
					: "text-muted-foreground"
			)}
		>
			{children}
		</span>
	);
}

/**
 * Reserved whether or not there is anything to say, so the card does not resize
 * the moment recut is switched on.
 */
export function Subtext({ children }: { children: string }) {
	return (
		<span className="h-4 truncate text-[11px] text-calc-subtext leading-4">
			{children}
		</span>
	);
}

/**
 * The percentage under a recut sum. Quieter than `Subtext`, because it is that
 * line's footnote rather than a second one of it, and reserved for the same
 * reason: switching recut on must not resize the card.
 */
export function Delta({ children }: { children: string }) {
	return (
		<span className="h-3.5 truncate text-[10px] text-calc-subtext leading-[0.875rem]">
			{children}
		</span>
	);
}

/** One of the three small readouts under the rule: RAP LIST, PRICE / CT, DISCOUNT. */
export function Metric({
	active,
	align = "start",
	label,
	onSelect,
	subtext,
	tone,
	value,
}: {
	active?: boolean;
	align?: "start" | "end";
	label: string;
	onSelect?: () => void;
	subtext?: string;
	tone?: "accent";
	value: string;
}) {
	const body = (
		<>
			<Caption active={active}>{label}</Caption>
			<span className="flex items-baseline gap-0.5">
				<span
					className={cn(
						"truncate font-semibold text-base tabular-nums",
						tone === "accent" ? "text-calc-accent" : "text-foreground"
					)}
				>
					{value}
				</span>
				{onSelect ? <Caret on={Boolean(active)} /> : null}
			</span>
			<Subtext>{subtext ?? ""}</Subtext>
		</>
	);

	const className = cn(
		"flex min-w-0 flex-col gap-0.5",
		align === "end" ? "items-end text-right" : "items-start text-left"
	);

	if (!onSelect) {
		return <div className={className}>{body}</div>;
	}

	return (
		<button className={className} onClick={onSelect} type="button">
			{body}
		</button>
	);
}

/** The headline pair at the top of each card: CARAT and TOTAL, or ROUGH WT. */
export function BigValue({
	active,
	align = "start",
	delta,
	label,
	onSelect,
	subtext,
	tone,
	value,
}: {
	active?: boolean;
	align?: "start" | "end";
	/** The recut percentage, on its own line under the subtext. */
	delta?: string;
	label: string;
	onSelect?: () => void;
	subtext?: string;
	tone?: "accent";
	value: string;
}) {
	const body = (
		<>
			<Caption active={active}>{label}</Caption>
			<span className="flex items-baseline gap-0.5">
				<span
					className={cn(
						"truncate font-bold text-3xl tabular-nums tracking-tight",
						tone === "accent" ? "text-calc-accent" : "text-foreground"
					)}
				>
					{value}
				</span>
				{onSelect ? <Caret on={Boolean(active)} /> : null}
			</span>
			<Subtext>{subtext ?? ""}</Subtext>
			{delta === undefined ? null : <Delta>{delta}</Delta>}
		</>
	);

	const className = cn(
		"flex min-w-0 flex-col gap-0.5",
		align === "end" ? "items-end text-right" : "items-start text-left"
	);

	if (!onSelect) {
		return <div className={className}>{body}</div>;
	}

	return (
		<button className={className} onClick={onSelect} type="button">
			{body}
		</button>
	);
}
