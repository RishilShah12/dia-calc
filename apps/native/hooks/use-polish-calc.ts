import {
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	maxDecimalsFor,
} from "@dia-calc/calc/keypad";
import {
	backFromNet,
	compareQuotes,
	lookupPrice,
	type PriceGrid,
	perCaratFromTotal,
	pricedBy,
	quote,
	usd,
} from "@dia-calc/calc/rap-calc";
import { findShape, SHAPES } from "@dia-calc/calc/shapes";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { EMPTY, MAX_BACK, MIN_BACK } from "@/components/calc-base";
import { ACCENT, paletteFor, type Scheme } from "@/components/calc-theme";
import { useGuides } from "@/lib/guides";
import { orpc } from "@/utils/orpc";

/**
 * The polish calculator's whole state machine, with no view in it.
 *
 * Split out of `calculator.ios.tsx` so the SwiftUI and Jetpack Compose screens
 * price a stone through one implementation rather than two. Everything it
 * returns is a plain value or a plain callback — no SwiftUI nodes, no Compose
 * modifiers, no measurements — so the only thing a platform file decides is how
 * to draw it. Insets and window size stay in the views: those genuinely differ.
 */

const HOUR = 60 * 60 * 1000;

const signed = (value: number, format: (n: number) => string) =>
	`${value >= 0 ? "+" : "−"}${format(Math.abs(value))}`;

/**
 * The line under the recut total. Recut deliberately starts with an empty
 * weight, so "no price" would be wrong the moment the mode is switched on —
 * there is simply nothing to compare yet. The empty string still holds its
 * height, so the card does not resize once a weight arrives.
 *
 * It leads with the total the stone was worth before, not with the difference:
 * the difference is already the number in orange changing under the dealer's
 * thumb, and every other line on this card reads "was …" too.
 */
function totalWasFor(
	priced: boolean,
	afterCarat: number,
	baseTotal: string,
	deltaPct: number
): string {
	if (afterCarat <= 0) {
		return "";
	}
	if (!priced) {
		return "no price for that grade";
	}
	return `was ${baseTotal} · ${signed(deltaPct, (n) => `${n.toFixed(1)}%`)}`;
}

/** Everything the summary card shows, already formatted for display. */
export interface Readout {
	backPct: number;
	backText: string;
	backWas: string;
	caratText: string;
	caratWas: string;
	/** Per-carat list of whichever stone is showing — the base, or the recut. */
	listPerCarat: number;
	listText: string;
	listWas: string;
	netPerCarat: number;
	/** Plain digits, e.g. "4050" — what the keypad edits. */
	netRaw: string;
	/** Formatted for display, e.g. "$4,050". */
	netText: string;
	netWas: string;
	total: number;
	/** Plain digits, as `netRaw` is for the per-carat price. */
	totalRaw: string;
	totalText: string;
	totalWas: string;
}

/** What a wheel renders: a display title and the value it selects. */
export interface WheelOption {
	title: string;
	value: string;
}

export function usePolishCalc() {
	const scheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: HOUR,
		})
	);

	const [shapeName, setShapeName] = useState("Round");
	const [caratText, setCaratText] = useState("1.00");
	const [color, setColor] = useState("g");
	const [clarity, setClarity] = useState("vs1");
	const [backText, setBackText] = useState("-25");
	const [netText, setNetText] = useState("");
	const [totalText, setTotalText] = useState("");
	const [lastEdited, setLastEdited] = useState<"back" | "net" | "total">(
		"back"
	);
	const [target, setTarget] = useState<KeypadTarget>("carat");
	const guides = useGuides();

	// The recut ("after") stone. Seeded from the base stone when the mode is
	// switched on — deliberately not in a useState initialiser, which is how the
	// original web panel ended up comparing against a grade captured at mount.
	const [recut, setRecut] = useState(false);
	const [recutCaratText, setRecutCaratText] = useState("");
	const [recutColor, setRecutColor] = useState("g");
	const [recutClarity, setRecutClarity] = useState("vs1");
	const [recutBackText, setRecutBackText] = useState("-25");

	const shape = findShape(shapeName);
	const grid = priceList.data?.find((entry) => entry.shape === shape.list);

	// Grades are per-list, so switching to a list that doesn't publish the
	// current colour or clarity snaps back to its first valid grade. The recut
	// grades go through the same clamp or a shape switch can strand them outside
	// the grid, which reads as "no price" for a stone that is merely stale.
	useEffect(() => {
		if (!grid) {
			return;
		}
		const [firstColor] = grid.colors;
		const [firstClarity] = grid.clarities;
		if (firstColor) {
			if (!grid.colors.includes(color)) {
				setColor(firstColor);
			}
			if (!grid.colors.includes(recutColor)) {
				setRecutColor(firstColor);
			}
		}
		if (firstClarity) {
			if (!grid.clarities.includes(clarity)) {
				setClarity(firstClarity);
			}
			if (!grid.clarities.includes(recutClarity)) {
				setRecutClarity(firstClarity);
			}
		}
	}, [grid, color, clarity, recutColor, recutClarity]);

	const readout = buildReadout({
		backText,
		caratText,
		clarity,
		color,
		grid,
		lastEdited,
		netText,
		recut,
		recutBackText,
		recutCaratText,
		recutClarity,
		recutColor,
		totalText,
	});

	// While recut is on, the wheels, keypad and slider all drive the after-stone.
	const activeCaratText = recut ? recutCaratText : caratText;
	const activeCarat = Number.parseFloat(activeCaratText) || 0;
	const activeText = (() => {
		if (target === "carat") {
			return activeCaratText;
		}
		return target === "total" ? readout.totalRaw : readout.netRaw;
	})();

	const applyToActive = useCallback(
		(next: string) => {
			if (target === "carat") {
				(recut ? setRecutCaratText : setCaratText)(next);
				return;
			}
			// A typed total is just a per-carat price the dealer hasn't divided
			// yet, so both edit targets converge here before pricing.
			const typed = Number.parseFloat(next) || 0;
			const perCarat =
				target === "total" ? perCaratFromTotal(typed, activeCarat) : typed;
			if (recut) {
				// The recut stone is defined by its back %, so a typed price is
				// stored as the back it implies. Without this, editing PRICE / CT
				// while recut is on would silently retune the *base* stone.
				setRecutBackText(String(backFromNet(readout.listPerCarat, perCarat)));
				return;
			}
			if (target === "total") {
				setLastEdited("total");
				setTotalText(next);
				return;
			}
			setLastEdited("net");
			setNetText(next);
		},
		[activeCarat, readout.listPerCarat, recut, target]
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
			const value = String(Math.round(next));
			if (recut) {
				setRecutBackText(value);
				return;
			}
			setLastEdited("back");
			setBackText(value);
		},
		[recut]
	);

	/**
	 * Switching target freezes what is on screen into that field's buffer
	 * first, so editing continues from the displayed value rather than from a
	 * buffer left behind by an earlier edit.
	 */
	const selectTarget = useCallback(
		(next: KeypadTarget) => {
			if (next === "net") {
				setLastEdited("net");
				setNetText(readout.netPerCarat.toFixed(0));
			}
			if (next === "total") {
				setLastEdited("total");
				setTotalText(readout.total.toFixed(0));
			}
			setTarget(next);
		},
		[readout.netPerCarat, readout.total]
	);
	const selectCarat = useCallback(() => selectTarget("carat"), [selectTarget]);
	const selectNet = useCallback(() => selectTarget("net"), [selectTarget]);
	const selectTotal = useCallback(() => selectTarget("total"), [selectTarget]);

	const toggleRecut = useCallback(() => {
		setRecut((on) => {
			if (!on) {
				// Seed the after-stone's grades from the base stone, but not its
				// weight: recut exists because the stone is about to be made
				// lighter, and the dealer's next act is typing the new weight.
				setRecutCaratText("");
				setRecutColor(color);
				setRecutClarity(clarity);
				setRecutBackText(String(readout.backPct));
				setTarget("carat");
			}
			return !on;
		});
	}, [clarity, color, readout.backPct]);

	const onColor = recut ? setRecutColor : setColor;
	const onClarity = recut ? setRecutClarity : setClarity;

	return {
		// All three wheels share one caption colour; recut is a property of the
		// stone being priced, not of one wheel.
		captionColor: recut ? ACCENT : palette.label,
		clarity: recut ? recutClarity : clarity,
		clarityOptions: (grid?.clarities ?? []).map(gradeOption),
		color: recut ? recutColor : color,
		colorOptions: (grid?.colors ?? []).map(gradeOption),
		grid,
		guides,
		handleBackspace,
		handleClear,
		handleDigit,
		handleDiscount,
		handleDot,
		isPending: priceList.isPending,
		onClarity,
		onColor,
		onShape: setShapeName,
		palette,
		readout,
		recut,
		scheme,
		selectCarat,
		selectNet,
		selectTarget,
		selectTotal,
		shapeName,
		shapeOptions: SHAPES.map((item) => ({
			title: item.abbr,
			value: item.name,
		})),
		sliderValue: Math.min(MAX_BACK, Math.max(MIN_BACK, readout.backPct)),
		target,
		toggleRecut,
	};
}

const gradeOption = (grade: string): WheelOption => ({
	title: grade.toUpperCase(),
	value: grade,
});

/**
 * Prices the stone, and in recut mode prices the after-stone too, returning
 * every string the card renders. Split out of the component because it is pure
 * and because it is the only place the before/after pairing is decided.
 */
function buildReadout(input: {
	backText: string;
	caratText: string;
	clarity: string;
	color: string;
	grid: PriceGrid | undefined;
	lastEdited: "back" | "net" | "total";
	netText: string;
	recut: boolean;
	recutBackText: string;
	recutCaratText: string;
	recutClarity: string;
	recutColor: string;
	totalText: string;
}): Readout {
	const { grid, recut } = input;
	const noPrice = {
		bracket: null,
		bracketIndex: -1,
		clamped: null,
		perCarat: null,
	};

	const baseCarat = Number.parseFloat(input.caratText) || 0;
	const baseFound = grid
		? lookupPrice(grid, baseCarat, input.color, input.clarity)
		: noPrice;
	const baseList = baseFound.perCarat ?? 0;
	const base = quote(baseList, baseCarat, pricedBy(input, baseCarat));

	const money = (value: number, hasPrice: boolean) =>
		grid && hasPrice ? usd(value) : EMPTY;
	const pct = (value: number) => (grid ? `${value.toFixed(0)}%` : EMPTY);

	if (!recut) {
		// The typed field keeps its raw buffer, so a half-typed "-2" is not
		// rewritten under the dealer's thumb; the derived ones are recomputed.
		const netTextOut =
			input.lastEdited === "net"
				? input.netText
				: (base.netPerCarat || 0).toFixed(0);
		const totalRaw =
			input.lastEdited === "total"
				? input.totalText
				: (base.total || 0).toFixed(0);
		return {
			backPct: base.backPct,
			backText: pct(base.backPct),
			backWas: "",
			caratText: input.caratText || "0",
			caratWas: "",
			listPerCarat: baseList,
			listText: money(baseList, baseFound.perCarat !== null),
			listWas: "",
			netPerCarat: base.netPerCarat,
			netRaw: netTextOut,
			netText: money(base.netPerCarat, baseFound.perCarat !== null),
			netWas: "",
			total: base.total,
			totalRaw,
			totalText: money(base.total, baseFound.perCarat !== null),
			totalWas: "",
		};
	}

	const afterCarat = Number.parseFloat(input.recutCaratText) || 0;
	const afterFound = grid
		? lookupPrice(grid, afterCarat, input.recutColor, input.recutClarity)
		: noPrice;
	const afterList = afterFound.perCarat ?? 0;
	const afterBack = Number.parseFloat(input.recutBackText) || 0;
	const after = quote(afterList, afterCarat, { backPct: afterBack });
	const { deltaPct } = compareQuotes(base, after, baseCarat, afterCarat);
	const priced = afterFound.perCarat !== null;

	return {
		backPct: after.backPct,
		backText: pct(after.backPct),
		backWas: `was ${pct(base.backPct)}`,
		caratText: input.recutCaratText || "0",
		caratWas: `was ${input.caratText}`,
		listPerCarat: afterList,
		listText: money(afterList, priced),
		listWas: `was ${money(baseList, baseFound.perCarat !== null)}`,
		netPerCarat: after.netPerCarat,
		netRaw: (after.netPerCarat || 0).toFixed(0),
		netText: money(after.netPerCarat, priced),
		netWas: `was ${money(base.netPerCarat, baseFound.perCarat !== null)}`,
		total: after.total,
		totalRaw: (after.total || 0).toFixed(0),
		totalText: money(after.total, priced),
		// Recut opens with no weight, by design — until one is typed there is
		// nothing to compare, which is not the same as the grade being unpriced.
		totalWas: totalWasFor(
			priced,
			afterCarat,
			money(base.total, baseFound.perCarat !== null),
			deltaPct
		),
	};
}
