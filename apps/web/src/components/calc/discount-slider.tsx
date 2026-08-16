"use client";

import { MAX_BACK, MIN_BACK } from "@dia-calc/calc/rap-calc";
import { Slider } from "@dia-calc/ui/components/slider";
import { useCallback, useMemo } from "react";

import { Caption } from "./metric";

/**
 * Discount off list, from full price down to zero in 1% steps.
 *
 * The trade says a discount as a negative: −28 is "28 back". The slider runs the
 * same way, so dragging left is dropping the price, which is the direction the
 * number moves too.
 */

export default function DiscountSlider({
	guides,
	onChange,
	tone,
	value,
}: {
	guides: boolean;
	onChange: (next: number) => void;
	tone?: "accent";
	value: number;
}) {
	const handleChange = useCallback(
		(next: number | readonly number[]) => {
			onChange(typeof next === "number" ? next : (next[0] ?? 0));
		},
		[onChange]
	);
	const sliderValue = useMemo(() => [value], [value]);

	return (
		<div className="flex flex-col gap-1 px-1">
			{guides ? (
				<div className="flex items-center justify-between">
					<Caption tone={tone}>Discount off list</Caption>
					<span className="font-semibold text-calc-accent text-xs tabular-nums">
						{`${value.toFixed(0)}%`}
					</span>
				</div>
			) : null}
			<div className="flex items-center gap-2">
				<span className="w-8 shrink-0 text-[10px] text-calc-subtle tabular-nums">
					{MIN_BACK}%
				</span>
				<Slider
					aria-label="Discount off list"
					className="flex-1"
					max={MAX_BACK}
					min={MIN_BACK}
					onValueChange={handleChange}
					step={1}
					value={sliderValue}
				/>
				<span className="w-8 shrink-0 text-right text-[10px] text-calc-subtle tabular-nums">
					{MAX_BACK}%
				</span>
			</div>
		</div>
	);
}
