"use client";

import {
	type BackStep,
	formatBack,
	MAX_BACK,
	MIN_BACK,
	snapBack,
} from "@dia-calc/calc/rap-calc";
import { Slider } from "@dia-calc/ui/components/slider";
import { cn } from "@dia-calc/ui/lib/utils";
import { useCallback, useMemo, useState } from "react";

import { Caption } from "./metric";

/**
 * Discount off list, from worthless at −100 through list at 0 to double list at
 * +100.
 *
 * The trade says a discount as a negative: −28 is "28 back". The slider runs the
 * same way, so dragging left is dropping the price, which is the direction the
 * number moves too. A back is quoted to the half as often as to the whole, so
 * the ½ button halves the step rather than making every drag hunt for one.
 *
 * Still a track and not the tape the native apps use: a mouse can land on a
 * pixel where a thumb cannot, so the precision problem that made the native
 * slider unusable does not arise here.
 */

const HALF: BackStep = 0.5;

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
	const [step, setStep] = useState<BackStep>(1);
	const handleChange = useCallback(
		(next: number | readonly number[]) => {
			onChange(typeof next === "number" ? next : (next[0] ?? 0));
		},
		[onChange]
	);
	const sliderValue = useMemo(() => [value], [value]);

	const half = step === HALF;
	const toggleStep = useCallback(() => {
		const next: BackStep = half ? 1 : HALF;
		setStep(next);
		// Coming back to whole percents with a half selected would leave the
		// reading a half step off every stop on the track.
		const snapped = snapBack(value, next);
		if (snapped !== value) {
			onChange(snapped);
		}
	}, [half, onChange, value]);

	const controls = (
		<div className="flex items-center gap-2">
			<button
				aria-label="Half percent steps"
				aria-pressed={half}
				className={cn(
					"rounded-full border px-2 py-0.5 font-semibold text-xs leading-none transition-colors",
					half
						? "border-calc-accent bg-calc-accent text-calc-accent-foreground"
						: "border-border text-calc-subtle"
				)}
				onClick={toggleStep}
				type="button"
			>
				½
			</button>
			<span className="font-semibold text-calc-accent text-xs tabular-nums">
				{formatBack(value, step)}
			</span>
		</div>
	);

	return (
		<div className="flex flex-col gap-1 px-1">
			{guides ? (
				<div className="flex items-center justify-between">
					<Caption tone={tone}>Discount off list</Caption>
					{controls}
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
					step={step}
					value={sliderValue}
				/>
				<span className="w-8 shrink-0 text-right text-[10px] text-calc-subtle tabular-nums">
					+{MAX_BACK}%
				</span>
				{/* Guides off drops the caption, which leaves the reading and the
				    toggle nowhere to sit but beside the track. */}
				{guides === false ? controls : null}
			</div>
		</div>
	);
}
