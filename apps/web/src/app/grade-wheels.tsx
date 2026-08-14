"use client";

import { SHAPES } from "@dia-calc/calc/shapes";

import WheelPicker from "./wheel-picker";

interface Props {
	clarities: string[];
	clarity: string;
	color: string;
	colors: string[];
	onClarity: (clarity: string) => void;
	onColor: (color: string) => void;
	onShape: (shape: string) => void;
	shapeName: string;
}

const SHAPE_ITEMS = SHAPES.map((shape) => ({
	label: shape.abbr,
	value: shape.name,
}));

export default function GradeWheels({
	clarity,
	clarities,
	color,
	colors,
	onClarity,
	onColor,
	onShape,
	shapeName,
}: Props) {
	const colorItems = colors.map((entry) => ({
		label: entry.toUpperCase(),
		value: entry,
	}));
	const clarityItems = clarities.map((entry) => ({
		label: entry.toUpperCase(),
		value: entry,
	}));

	return (
		<div className="flex min-h-0 flex-1 items-center px-3">
			<div className="flex w-full gap-1">
				<WheelPicker
					aria-label="Shape"
					items={SHAPE_ITEMS}
					onChange={onShape}
					value={shapeName}
				/>
				<WheelPicker
					aria-label="Color"
					items={colorItems}
					onChange={onColor}
					value={color}
				/>
				<WheelPicker
					aria-label="Clarity"
					items={clarityItems}
					onChange={onClarity}
					value={clarity}
				/>
			</div>
		</div>
	);
}
