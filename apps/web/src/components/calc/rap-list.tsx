"use client";

import { useRapList } from "@dia-calc/calc/rap";
import { EMPTY, formatBracket, usd } from "@dia-calc/calc/rap-calc";
import { listLabel, RAP_LISTS } from "@dia-calc/calc/shapes";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@dia-calc/ui/components/empty";
import { Skeleton } from "@dia-calc/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dia-calc/ui/components/toggle-group";
import { useCallback, useMemo } from "react";

import { usePriceList } from "@/hooks/use-price-list";

import RapTable from "./rap-table";
import WheelPicker from "./wheel-picker";

/**
 * Which list, and which size in it — the two questions that have to be answered
 * before a row of prices means anything — then the grid itself.
 */

export default function RapList() {
	const { grids, isPending } = usePriceList();
	const rap = useRapList(grids);

	const listValue = useMemo(() => [rap.list], [rap.list]);
	const handleList = useCallback(
		(groupValue: string[]) => {
			const [next] = groupValue;
			if (next) {
				rap.handleList(next);
			}
		},
		[rap.handleList]
	);

	const brackets = useMemo(
		() =>
			rap.brackets.map((bracket, index) => ({
				title: formatBracket(bracket),
				value: String(index),
			})),
		[rap.brackets]
	);

	const grid = (() => {
		if (rap.grid) {
			return (
				<RapTable
					clarities={rap.grid.clarities}
					colors={rap.grid.colors}
					onPick={rap.setPicked}
					picked={rap.picked}
					prices={rap.prices}
				/>
			);
		}
		if (isPending) {
			return <Skeleton className="min-h-0 flex-1 rounded-calc" />;
		}
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No list loaded</EmptyTitle>
					<EmptyDescription>
						The Rapaport list could not be loaded. Try Refresh from the account
						panel.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	})();

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
			<section className="flex flex-col gap-2 rounded-calc bg-card p-3 ring-1 ring-border">
				<ToggleGroup
					className="w-full rounded-calc bg-muted p-1"
					onValueChange={handleList}
					value={listValue}
				>
					{RAP_LISTS.map((entry) => (
						<ToggleGroupItem
							className="h-8 flex-1 rounded-calc font-semibold text-xs data-[pressed]:bg-calc-accent data-[pressed]:text-calc-accent-foreground"
							key={entry}
							value={entry}
						>
							{listLabel(entry)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<WheelPicker
					aria-label="Size"
					label={rap.guides ? "Size" : null}
					onChange={rap.handleBracket}
					options={brackets}
					value={String(rap.safeIndex)}
				/>
			</section>

			<div className="flex items-center justify-between px-1">
				<span className="text-[11px] text-muted-foreground uppercase tracking-widest">
					Price per carat
				</span>
				{rap.picked ? (
					<span className="font-semibold text-calc-accent text-xs tabular-nums">
						{`${rap.picked.color.toUpperCase()} ${rap.picked.clarity.toUpperCase()} · ${
							rap.pickedPrice === null ? EMPTY : usd(rap.pickedPrice)
						}`}
					</span>
				) : (
					<span className="text-[11px] text-calc-subtle uppercase tracking-widest">
						Tap a cell
					</span>
				)}
			</div>

			{grid}
		</div>
	);
}
