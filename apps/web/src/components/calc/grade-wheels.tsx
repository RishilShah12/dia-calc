"use client";

import type { WheelOption } from "@dia-calc/calc/polish";

import WheelPicker from "./wheel-picker";

/**
 * Shape, colour, clarity — the three wheels that say which stone is being
 * priced. Captions come and go with the guides setting, exactly as on native,
 * and turn accent together while recut is on, because recut is a property of the
 * stone rather than of one wheel.
 */

export default function GradeWheels({
	clarity,
	clarityOptions,
	color,
	colorOptions,
	guides,
	onClarity,
	onColor,
	onShape,
	rows,
	shapeName,
	shapeOptions,
}: {
	clarity: string;
	clarityOptions: WheelOption[];
	color: string;
	colorOptions: WheelOption[];
	guides: boolean;
	onClarity: (clarity: string) => void;
	onColor: (color: string) => void;
	onShape: (shape: string) => void;
	/** Rough asks for the short wheel; polish has the room for the tall one. */
	rows?: 3 | 5;
	shapeName: string;
	shapeOptions: WheelOption[];
}) {
	const label = (text: string) => (guides ? text : null);

	return (
		<div className="flex w-full gap-1">
			<WheelPicker
				aria-label="Shape"
				label={label("Shape")}
				onChange={onShape}
				options={shapeOptions}
				rows={rows}
				value={shapeName}
			/>
			<WheelPicker
				aria-label="Color"
				label={label("Color")}
				onChange={onColor}
				options={colorOptions}
				rows={rows}
				value={color}
			/>
			<WheelPicker
				aria-label="Clarity"
				label={label("Clarity")}
				onChange={onClarity}
				options={clarityOptions}
				rows={rows}
				value={clarity}
			/>
		</div>
	);
}
