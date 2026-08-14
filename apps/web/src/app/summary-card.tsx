"use client";

import type { KeypadTarget } from "@dia-calc/calc/keypad";
import { usd } from "@dia-calc/calc/rap-calc";
import { cn } from "@dia-calc/ui/lib/utils";
import { useCallback } from "react";

interface Props {
	backPct: number;
	caratText: string;
	listPerCarat: number | null;
	netPerCarat: number;
	onSelectTarget: (target: KeypadTarget) => void;
	target: KeypadTarget;
	total: number;
}

function Metric({
	active,
	label,
	onSelect,
	tone,
	value,
}: {
	active?: boolean;
	label: string;
	onSelect?: () => void;
	tone?: "accent";
	value: string;
}) {
	const content = (
		<>
			<span className="text-[10px] text-muted-foreground uppercase tracking-widest">
				{label}
			</span>
			<span
				className={cn(
					"truncate font-semibold text-sm tabular-nums",
					tone === "accent" && "text-calc-accent"
				)}
			>
				{value}
			</span>
		</>
	);

	if (!onSelect) {
		return (
			<div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1 py-1">
				{content}
			</div>
		);
	}

	return (
		<button
			aria-pressed={active}
			className={cn(
				"flex min-w-0 flex-1 flex-col gap-0.5 rounded-calc px-1 py-1 text-left",
				active && "ring-2 ring-calc-accent ring-offset-2 ring-offset-card"
			)}
			onClick={onSelect}
			type="button"
		>
			{content}
		</button>
	);
}

export default function SummaryCard({
	backPct,
	caratText,
	listPerCarat,
	netPerCarat,
	onSelectTarget,
	target,
	total,
}: Props) {
	const selectCarat = useCallback(
		() => onSelectTarget("carat"),
		[onSelectTarget]
	);
	const selectNet = useCallback(() => onSelectTarget("net"), [onSelectTarget]);
	const selectDiscount = useCallback(
		() => onSelectTarget("discount"),
		[onSelectTarget]
	);

	const caratDisplay = caratText.length > 0 ? caratText : "0";
	const listLabel = listPerCarat === null ? "—" : usd(listPerCarat);
	const hasFraction = backPct % 1 !== 0;
	const discountLabel = `${backPct > 0 ? "+" : ""}${backPct.toFixed(hasFraction ? 1 : 0)}%`;

	return (
		<div className="flex flex-col gap-2 px-3">
			<section className="flex flex-col gap-4 rounded-calc bg-card p-4 shadow-sm ring-1 ring-foreground/8">
				<div className="flex items-start justify-between gap-3">
					<button
						aria-pressed={target === "carat"}
						className={cn(
							"flex min-w-0 flex-col gap-1 rounded-calc text-left",
							target === "carat" &&
								"ring-2 ring-calc-accent ring-offset-2 ring-offset-card"
						)}
						onClick={selectCarat}
						type="button"
					>
						<span className="text-[10px] text-muted-foreground uppercase tracking-widest">
							Carat
						</span>
						<span className="font-semibold text-4xl tabular-nums tracking-tight">
							{caratDisplay}
						</span>
					</button>
					<div className="flex min-w-0 flex-col items-end gap-1">
						<span className="text-[10px] text-muted-foreground uppercase tracking-widest">
							Total
						</span>
						<span className="font-semibold text-4xl text-calc-total tabular-nums tracking-tight">
							{listPerCarat === null ? "—" : usd(total)}
						</span>
					</div>
				</div>

				<div className="flex gap-1">
					<Metric label="Rap list" value={listLabel} />
					<Metric
						active={target === "net"}
						label="Price / ct"
						onSelect={selectNet}
						tone="accent"
						value={listPerCarat === null ? "—" : usd(netPerCarat)}
					/>
					<Metric
						active={target === "discount"}
						label="Discount"
						onSelect={selectDiscount}
						tone="accent"
						value={discountLabel}
					/>
				</div>
			</section>
		</div>
	);
}
