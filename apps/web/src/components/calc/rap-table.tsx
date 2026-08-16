"use client";

import type { Picked } from "@dia-calc/calc/rap";
import { EMPTY, usd } from "@dia-calc/calc/rap-calc";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@dia-calc/ui/components/table";
import { cn } from "@dia-calc/ui/lib/utils";
import { useCallback } from "react";

/**
 * The Rapaport grid itself, rather than the one cell of it a graded stone lands
 * on. A dealer quoting over the phone reads across a row — "G is 12,200, H is
 * 11,000" — which the calculator cannot answer without re-spinning two wheels.
 *
 * The native table drives its pinned heading row and colour column off two
 * `Animated.Value`s, because React Native has no `position: sticky`. The browser
 * does, so that whole mechanism is one class here.
 */

/** Solid where the row and the column cross, tinted along both of them. */
function cellTint(onRow: boolean, onColumn: boolean): string {
	if (onRow && onColumn) {
		return "bg-calc-accent font-bold text-calc-accent-foreground";
	}
	return onRow || onColumn ? "bg-calc-accent/12" : "";
}

/**
 * Takes the grade rather than a handler so the click closure is built here, once
 * per cell, instead of freshly on every render of the whole table.
 */
function Cell({
	clarity,
	color,
	onPick,
	price,
	tint,
}: {
	clarity: string;
	color: string;
	onPick: (next: Picked) => void;
	price: number | null;
	tint: string;
}) {
	const handleClick = useCallback(
		() => onPick({ clarity, color }),
		[clarity, color, onPick]
	);

	return (
		<TableCell className="p-0">
			<button
				className={cn(
					"h-11 w-full min-w-24 px-3 text-center font-medium text-sm tabular-nums transition-colors",
					tint
				)}
				onClick={handleClick}
				type="button"
			>
				{price === null ? EMPTY : usd(price)}
			</button>
		</TableCell>
	);
}

export default function RapTable({
	clarities,
	colors,
	onPick,
	picked,
	prices,
}: {
	clarities: string[];
	colors: string[];
	onPick: (next: Picked) => void;
	picked: Picked | null;
	prices: (number | null)[][];
}) {
	return (
		<div className="min-h-0 flex-1 overflow-auto rounded-calc border border-border bg-card">
			<Table>
				<TableHeader>
					<TableRow>
						{/* Both sticky, so the corner stays put in either direction. */}
						<TableHead className="sticky top-0 left-0 z-20 w-12 bg-card" />
						{clarities.map((clarity) => (
							<TableHead
								className={cn(
									"sticky top-0 z-10 bg-card text-center font-semibold text-foreground",
									picked?.clarity === clarity && "bg-calc-accent/12"
								)}
								key={clarity}
							>
								{clarity.toUpperCase()}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{colors.map((color, colorIndex) => (
						<TableRow key={color}>
							<TableHead
								className={cn(
									"sticky left-0 z-10 w-12 bg-card text-center font-bold text-foreground",
									picked?.color === color && "bg-calc-accent/12"
								)}
							>
								{color.toUpperCase()}
							</TableHead>
							{clarities.map((clarity, clarityIndex) => (
								<Cell
									clarity={clarity}
									color={color}
									key={clarity}
									onPick={onPick}
									price={prices[colorIndex]?.[clarityIndex] ?? null}
									tint={cellTint(
										picked?.color === color,
										picked?.clarity === clarity
									)}
								/>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
