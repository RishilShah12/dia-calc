"use client";

import { usd } from "@dia-calc/calc/rap-calc";
import { money, partLabel, pct, useRoughCalc } from "@dia-calc/calc/rough";
import { Button } from "@dia-calc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@dia-calc/ui/components/empty";
import { Separator } from "@dia-calc/ui/components/separator";
import { Skeleton } from "@dia-calc/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dia-calc/ui/components/toggle-group";
import { List, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

import { usePriceList } from "@/hooks/use-price-list";
import { dispatchPhysicalKey } from "@/lib/keypad-keys";

import DiscountSlider from "./discount-slider";
import GradeWheels from "./grade-wheels";
import Keypad, { KeypadKey } from "./keypad";
import { BigValue, Metric } from "./metric";
import PartsSheet from "./parts-sheet";

/**
 * The rough screen answers a different question from the polish one: not "what
 * is this stone worth" but "what can I pay for this rough". The dealer enters a
 * rough weight, plans the parts they would cut from it, grades each, and reads
 * one number off the top — value per carat of rough.
 */

export default function RoughCalculator() {
	const { grids, isPending } = usePriceList();
	const calc = useRoughCalc(grids);

	const { activePart, activeQuote, summary, target } = calc;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const handled = dispatchPhysicalKey(event, {
				backspace: calc.handleBackspace,
				clear: calc.handleClear,
				digit: calc.handleDigit,
				dot: calc.handleDot,
			});
			if (handled) {
				event.preventDefault();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		calc.handleBackspace,
		calc.handleClear,
		calc.handleDigit,
		calc.handleDot,
	]);

	const activeValue = useMemo(() => [String(calc.active)], [calc.active]);
	const handlePart = useCallback(
		(groupValue: string[]) => {
			const [next] = groupValue;
			if (next) {
				calc.selectPart(next);
			}
		},
		[calc.selectPart]
	);

	if (!grids) {
		return (
			<div className="flex flex-col gap-3 p-4">
				{isPending ? (
					<>
						<Skeleton className="h-28 w-full rounded-calc" />
						<Skeleton className="h-44 w-full rounded-calc" />
						<Skeleton className="h-48 w-full rounded-calc" />
					</>
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>No price list</EmptyTitle>
							<EmptyDescription>
								The Rapaport list could not be loaded. Try Refresh from the
								account panel.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-1">
			<PartsSheet
				activeIndex={calc.active}
				onDelete={calc.deletePart}
				onOpenChange={calc.setPartsOpen}
				onSelect={calc.selectPartFromSheet}
				open={calc.partsOpen}
				parts={calc.parts}
				quotes={calc.quotes}
				roughText={calc.roughText}
				summary={summary}
			/>

			{/* The bottom line. Pinned above the part editor because it is the number
			    every other control on the screen is aimed at. */}
			<section className="flex shrink-0 flex-col gap-1 rounded-calc bg-card p-4 ring-1 ring-border">
				<div className="flex items-start justify-between gap-3">
					<BigValue
						active={target === "rough"}
						label="Rough wt"
						onSelect={calc.selectRough}
						value={calc.roughText || "0"}
					/>
					<BigValue
						align="end"
						label="Total value"
						tone="accent"
						value={usd(summary.total)}
					/>
				</div>
				<div className="flex items-center justify-between text-calc-subtext text-sm tabular-nums">
					<span>{`${summary.partsCarat.toFixed(2)} ct`}</span>
					<span>{`${usd(summary.perCarat, true)} /ct`}</span>
				</div>
			</section>

			{/* One part at a time: the wheels and the slider below can only ever
			    address one, so the picker says which. */}
			<section className="flex shrink-0 flex-col gap-2 rounded-calc bg-card p-3 ring-1 ring-border">
				<div className="flex items-center gap-2">
					{/* ponytail: segments squeeze as parts are added — swap for a
					    scrolling chip row if anyone plans more than about six. */}
					<ToggleGroup
						className="min-w-0 flex-1 rounded-calc bg-muted p-1"
						onValueChange={handlePart}
						value={activeValue}
					>
						{calc.parts.map((_, index) => (
							<ToggleGroupItem
								className="h-8 min-w-0 flex-1 rounded-calc font-semibold text-xs data-[pressed]:bg-calc-accent data-[pressed]:text-calc-accent-foreground"
								// biome-ignore lint/suspicious/noArrayIndexKey: a part's identity IS its position — that is what its A/B/C label means.
								key={index}
								value={String(index)}
							>
								{partLabel(index)}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<Button
						aria-label="All parts"
						onClick={calc.openParts}
						size="icon"
						variant="ghost"
					>
						<List />
					</Button>
					<Button
						aria-label="Add part"
						onClick={calc.addPart}
						size="icon"
						variant="ghost"
					>
						<Plus />
					</Button>
				</div>

				<div className="flex items-start justify-between gap-3">
					<BigValue
						active={target === "carat"}
						label="Carat"
						onSelect={calc.selectCarat}
						value={activePart.caratText || "0"}
					/>
					<BigValue
						active={target === "total"}
						align="end"
						label="Total"
						onSelect={calc.selectTotal}
						tone="accent"
						value={money(activeQuote.total, activeQuote.priced)}
					/>
				</div>

				<Separator />

				<div className="flex items-start justify-between gap-2">
					<Metric
						label="Rap list"
						value={money(activeQuote.listPerCarat, activeQuote.priced)}
					/>
					<Metric
						active={target === "net"}
						label="Price / ct"
						onSelect={calc.selectNet}
						tone="accent"
						value={money(activeQuote.netPerCarat, activeQuote.priced)}
					/>
					<Metric
						align="end"
						label="Discount"
						value={pct(activeQuote.backPct, activeQuote.priced)}
					/>
				</div>
			</section>

			<section className="flex shrink-0 flex-col justify-center gap-2 rounded-calc bg-card px-2 py-2 ring-1 ring-border">
				<GradeWheels
					clarity={activePart.clarity}
					clarityOptions={calc.clarityOptions}
					color={activePart.color}
					colorOptions={calc.colorOptions}
					guides={calc.guides}
					onClarity={calc.handleClarity}
					onColor={calc.handleColor}
					onShape={calc.handleShape}
					rows={3}
					shapeName={activePart.shapeName}
					shapeOptions={calc.shapeOptions}
				/>
				<Separator />
				<DiscountSlider
					guides={calc.guides}
					onChange={calc.handleDiscount}
					value={calc.sliderValue}
				/>
			</section>

			<Keypad
				actionKey={
					<KeypadKey
						active={target === "rough"}
						label="Rough weight"
						onPress={calc.selectRough}
					>
						ROUGH
					</KeypadKey>
				}
				onBackspace={calc.handleBackspace}
				onClear={calc.handleClear}
				onDigit={calc.handleDigit}
				onDot={calc.handleDot}
				onSelectTarget={calc.selectTarget}
				target={target}
			/>
		</div>
	);
}
