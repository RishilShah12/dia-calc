"use client";

import { usePolishCalc } from "@dia-calc/calc/polish";
import { inr } from "@dia-calc/calc/rap-calc";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@dia-calc/ui/components/empty";
import { Separator } from "@dia-calc/ui/components/separator";
import { Skeleton } from "@dia-calc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { usePriceList } from "@/hooks/use-price-list";
import { fxQueryOptions } from "@/lib/fx";
import { dispatchPhysicalKey } from "@/lib/keypad-keys";
import { useRate } from "@/lib/rate";

import DiscountSlider from "./discount-slider";
import GradeWheels from "./grade-wheels";
import Keypad, { KeypadKey } from "./keypad";
import { BigValue, Metric } from "./metric";

/**
 * The polish screen. Everything it draws comes from `usePolishCalc`, which the
 * SwiftUI and Compose screens render from too — what is here is only how the
 * browser says it.
 */

export default function PolishCalculator() {
	const { grids, isPending } = usePriceList();
	const calc = usePolishCalc(grids);
	const fx = useQuery(fxQueryOptions);
	const { typedRate } = useRate();

	const { readout, target } = calc;

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

	if (!calc.grid) {
		return (
			<div className="flex flex-col gap-3 p-4">
				{isPending ? (
					<>
						<Skeleton className="h-40 w-full rounded-calc" />
						<Skeleton className="h-48 w-full rounded-calc" />
						<Skeleton className="h-56 w-full rounded-calc" />
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

	// The dealer's own rate wins over the CDN's; without either there is nothing
	// honest to convert, so the line is simply absent.
	const rate = typedRate ?? fx.data?.inr ?? null;

	// The column scrolls rather than shrinks. Every card has a real content
	// height — a wheel is 170px whatever the window does — so letting flex
	// compress them below it spills their contents over the card beneath.
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-1">
			<section className="flex shrink-0 flex-col gap-3 rounded-calc bg-card p-4 ring-1 ring-border">
				<div className="flex items-start justify-between gap-3">
					<BigValue
						active={target === "carat"}
						label="Carat"
						onSelect={calc.selectCarat}
						subtext={readout.caratWas}
						value={readout.caratText}
					/>
					<BigValue
						active={target === "total"}
						align="end"
						label="Total"
						onSelect={calc.selectTotal}
						subtext={readout.totalWas}
						tone="accent"
						value={readout.totalText}
					/>
				</div>

				{rate === null ? null : (
					<p className="-mt-2 text-right text-[11px] text-calc-subtle tabular-nums">
						{inr(readout.total, rate)}
					</p>
				)}

				<Separator />

				<div className="flex items-start justify-between gap-2">
					<Metric
						label="Rap list"
						subtext={readout.listWas}
						value={readout.listText}
					/>
					<Metric
						active={target === "net"}
						label="Price / ct"
						onSelect={calc.selectNet}
						subtext={readout.netWas}
						tone="accent"
						value={readout.netText}
					/>
					<Metric
						align="end"
						label="Discount"
						subtext={readout.backWas}
						value={readout.backText}
					/>
				</div>
			</section>

			{/* Grades and discount are one decision about one stone, so they are one
			    card — a rule separates them, not a gap. */}
			<section className="flex shrink-0 flex-col justify-center gap-2 rounded-calc bg-card px-2 py-3 ring-1 ring-border">
				<GradeWheels
					clarity={calc.clarity}
					clarityOptions={calc.clarityOptions}
					color={calc.color}
					colorOptions={calc.colorOptions}
					guides={calc.guides}
					onClarity={calc.onClarity}
					onColor={calc.onColor}
					onShape={calc.onShape}
					shapeName={calc.shapeName}
					shapeOptions={calc.shapeOptions}
				/>
				<Separator />
				<DiscountSlider
					guides={calc.guides}
					onChange={calc.handleDiscount}
					tone={calc.recut ? "accent" : undefined}
					value={calc.sliderValue}
				/>
			</section>

			<Keypad
				actionKey={
					<KeypadKey
						active={calc.recut}
						label="Recut"
						onPress={calc.toggleRecut}
					>
						RECUT
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
