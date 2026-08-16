import { useCallback, useEffect, useState } from "react";

import { useGuides } from "./guides";
import {
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	maxDecimalsFor,
} from "./keypad";
import type { WheelOption } from "./polish";
import {
	EMPTY,
	lookupPrice,
	MAX_BACK,
	MIN_BACK,
	type PriceGrid,
	pricedBy,
	quote,
	summarizeRough,
	usd,
} from "./rap-calc";
import { findShape, SHAPES } from "./shapes";

/**
 * The rough calculator's state machine, with no view in it.
 *
 * The rough screen answers a different question from the polish one: not "what
 * is this stone worth" but "what can I pay for this rough". The dealer enters a
 * rough weight, plans the parts they would cut from it, grades each, and reads
 * one number off the top — value per carat of rough.
 *
 * Each part is priced exactly like a polished stone, so there is no second
 * pricing model here. `summarizeRough` only sums the parts and divides by the
 * rough. Everything else is layout, and layout is what the platforms own.
 */

/** One planned part. Same fields the polish screen keeps for a single stone. */
export interface Part {
	backText: string;
	caratText: string;
	clarity: string;
	color: string;
	lastEdited: "back" | "net" | "total";
	netText: string;
	shapeName: string;
	totalText: string;
}

export const blankPart = (): Part => ({
	backText: "-25",
	caratText: "",
	clarity: "vs1",
	color: "g",
	lastEdited: "back",
	netText: "",
	shapeName: "Round",
	totalText: "",
});

/**
 * ponytail: A-Z only — a 27th part would label itself "[". Nobody plans 27
 * parts off one rough on a phone; switch to numbers if anyone ever does.
 */
export const partLabel = (index: number) => String.fromCharCode(65 + index);

const gridFor = (part: Part, grids: PriceGrid[] | undefined) =>
	grids?.find((entry) => entry.shape === findShape(part.shapeName).list);

export interface PartQuote {
	backPct: number;
	carat: number;
	listPerCarat: number;
	netPerCarat: number;
	/** False for an unpublished grade, so the card shows a dash, not $0. */
	priced: boolean;
	total: number;
}

/** Prices one part as its own stone. Pure, so the sheet and the card agree. */
export function quotePart(
	part: Part,
	grids: PriceGrid[] | undefined
): PartQuote {
	const carat = Number.parseFloat(part.caratText) || 0;
	const grid = gridFor(part, grids);
	const found = grid
		? lookupPrice(grid, carat, part.color, part.clarity)
		: null;
	const listPerCarat = found?.perCarat ?? null;
	return {
		priced: listPerCarat !== null,
		...quote(listPerCarat ?? 0, carat, pricedBy(part, carat)),
		carat,
	};
}

/**
 * Grades are per-list, so a part on a list that doesn't publish its colour or
 * clarity snaps back to that list's first valid grade. Returns the part
 * untouched when nothing moved, which is what lets the caller skip the setState.
 */
function clampPart(part: Part, grids: PriceGrid[] | undefined): Part {
	const grid = gridFor(part, grids);
	if (!grid) {
		return part;
	}
	const [firstColor] = grid.colors;
	const [firstClarity] = grid.clarities;
	const color = grid.colors.includes(part.color)
		? part.color
		: (firstColor ?? part.color);
	const clarity = grid.clarities.includes(part.clarity)
		? part.clarity
		: (firstClarity ?? part.clarity);
	return color === part.color && clarity === part.clarity
		? part
		: { ...part, clarity, color };
}

export const money = (value: number, priced: boolean) =>
	priced ? usd(value) : EMPTY;
export const pct = (value: number, priced: boolean) =>
	priced ? `${value.toFixed(0)}%` : EMPTY;

const gradeOption = (grade: string): WheelOption => ({
	title: grade.toUpperCase(),
	value: grade,
});

export function useRoughCalc(grids: PriceGrid[] | undefined) {
	const guides = useGuides();

	const [roughText, setRoughText] = useState("");
	const [parts, setParts] = useState<Part[]>(() => [blankPart()]);
	const [active, setActive] = useState(0);
	const [target, setTarget] = useState<KeypadTarget>("rough");
	const [partsOpen, setPartsOpen] = useState(false);

	// The grid arrives after mount, so the seeded grades only become checkable
	// here. Returning `prev` unchanged is what stops this looping.
	useEffect(() => {
		if (!grids) {
			return;
		}
		setParts((prev) => {
			const next = prev.map((part) => clampPart(part, grids));
			return next.some((part, index) => part !== prev[index]) ? next : prev;
		});
	}, [grids]);

	const updateActive = useCallback(
		(patch: Partial<Part>) => {
			setParts((prev) =>
				prev.map((part, index) =>
					index === active ? { ...part, ...patch } : part
				)
			);
		},
		[active]
	);

	const roughCarat = Number.parseFloat(roughText) || 0;
	const activePart = parts[active] ?? blankPart();
	const activeQuote = quotePart(activePart, grids);
	const quotes = parts.map((part) => quotePart(part, grids));
	const summary = summarizeRough(roughCarat, quotes);
	const grid = gridFor(activePart, grids);

	// The typed field keeps its raw buffer, so a half-typed "-2" is not
	// rewritten under the dealer's thumb; the derived one is recomputed.
	const netRaw =
		activePart.lastEdited === "net"
			? activePart.netText
			: (activeQuote.netPerCarat || 0).toFixed(0);
	const totalRaw =
		activePart.lastEdited === "total"
			? activePart.totalText
			: (activeQuote.total || 0).toFixed(0);

	const activeText = (() => {
		if (target === "rough") {
			return roughText;
		}
		if (target === "carat") {
			return activePart.caratText;
		}
		return target === "total" ? totalRaw : netRaw;
	})();

	const applyToActive = useCallback(
		(next: string) => {
			if (target === "rough") {
				setRoughText(next);
				return;
			}
			if (target === "carat") {
				updateActive({ caratText: next });
				return;
			}
			// A typed total is just a per-carat price the dealer hasn't divided
			// yet; `pricedBy` does that division when the part is quoted.
			if (target === "total") {
				updateActive({ lastEdited: "total", totalText: next });
				return;
			}
			updateActive({ lastEdited: "net", netText: next });
		},
		[target, updateActive]
	);

	const handleDigit = useCallback(
		(digit: string) => {
			applyToActive(keypadDigit(activeText, digit, maxDecimalsFor(target)));
		},
		[activeText, applyToActive, target]
	);
	const handleDot = useCallback(() => {
		applyToActive(keypadDot(activeText, maxDecimalsFor(target)));
	}, [activeText, applyToActive, target]);
	const handleBackspace = useCallback(() => {
		applyToActive(keypadBackspace(activeText));
	}, [activeText, applyToActive]);
	const handleClear = useCallback(() => applyToActive(""), [applyToActive]);

	const handleDiscount = useCallback(
		(next: number) => {
			updateActive({ backText: String(Math.round(next)), lastEdited: "back" });
		},
		[updateActive]
	);

	/**
	 * Switching target freezes what is on screen into that field's buffer first,
	 * so editing continues from the displayed value rather than from a buffer
	 * left behind by an earlier edit.
	 */
	const selectTarget = useCallback(
		(next: KeypadTarget) => {
			if (next === "net") {
				updateActive({
					lastEdited: "net",
					netText: activeQuote.netPerCarat.toFixed(0),
				});
			}
			if (next === "total") {
				updateActive({
					lastEdited: "total",
					totalText: activeQuote.total.toFixed(0),
				});
			}
			setTarget(next);
		},
		[activeQuote.netPerCarat, activeQuote.total, updateActive]
	);
	const selectRough = useCallback(() => setTarget("rough"), []);
	const selectCarat = useCallback(() => selectTarget("carat"), [selectTarget]);
	const selectNet = useCallback(() => selectTarget("net"), [selectTarget]);
	const selectTotal = useCallback(() => selectTarget("total"), [selectTarget]);

	const selectPart = useCallback((next: string) => {
		setActive(Number(next));
	}, []);

	const addPart = useCallback(() => {
		// Grades carry over — a rough usually yields similar goods — but the
		// weight does not: a copied weight silently doubles the rough's total.
		setParts((prev) => {
			const source = prev[active] ?? blankPart();
			return [
				...prev,
				{
					...source,
					caratText: "",
					lastEdited: "back" as const,
					netText: "",
					totalText: "",
				},
			];
		});
		setActive(parts.length);
		setTarget("carat");
	}, [active, parts.length]);

	const deletePart = useCallback((index: number) => {
		setParts((prev) =>
			prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
		);
		// Anything at or after the hole shifts down one; the selection follows it.
		setActive((current) =>
			current < index ? current : Math.max(0, current - 1)
		);
	}, []);

	const selectPartFromSheet = useCallback((index: number) => {
		setActive(index);
		setPartsOpen(false);
	}, []);

	const handleShape = useCallback(
		(shapeName: string) => {
			setParts((prev) =>
				prev.map((part, index) =>
					index === active ? clampPart({ ...part, shapeName }, grids) : part
				)
			);
		},
		[active, grids]
	);
	const handleColor = useCallback(
		(color: string) => updateActive({ color }),
		[updateActive]
	);
	const handleClarity = useCallback(
		(clarity: string) => updateActive({ clarity }),
		[updateActive]
	);

	const openParts = useCallback(() => setPartsOpen(true), []);

	return {
		active,
		activePart,
		activeQuote,
		addPart,
		clarityOptions: (grid?.clarities ?? []).map(gradeOption),
		colorOptions: (grid?.colors ?? []).map(gradeOption),
		deletePart,
		grid,
		guides,
		handleBackspace,
		handleClarity,
		handleClear,
		handleColor,
		handleDigit,
		handleDiscount,
		handleDot,
		handleShape,
		openParts,
		parts,
		partsOpen,
		quotes,
		roughCarat,
		roughText,
		selectCarat,
		selectNet,
		selectPart,
		selectPartFromSheet,
		selectRough,
		selectTarget,
		selectTotal,
		setPartsOpen,
		shapeOptions: SHAPES.map((item) => ({
			title: item.abbr,
			value: item.name,
		})),
		sliderValue: Math.min(MAX_BACK, Math.max(MIN_BACK, activeQuote.backPct)),
		summary,
		target,
	};
}
