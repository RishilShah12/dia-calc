import { useCallback, useEffect, useState } from "react";

import { useGuides } from "./guides";
import {
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	maxDecimalsFor,
} from "./keypad";
import { showKeypad } from "./keypad-visible";
import {
	backFromNet,
	compareQuotes,
	EMPTY,
	formatBack,
	lookupPrice,
	MAX_BACK,
	MIN_BACK,
	type PriceGrid,
	perCaratFromTotal,
	pricedBy,
	quote,
	usd,
} from "./rap-calc";
import { totalDeltaFor, totalWasFor } from "./recut";
import { CLARITIES, COLORS, findShape, SHAPES } from "./shapes";

/**
 * The polish calculator's whole state machine, with no view in it.
 *
 * Lives here rather than in an app so SwiftUI, Jetpack Compose and the DOM price
 * a stone through one implementation rather than three. Everything it returns is
 * a plain value or a plain callback — no SwiftUI nodes, no Compose modifiers, no
 * DOM, no measurements — so the only thing a platform decides is how to draw it.
 * Insets, window size and palette stay in the views: those genuinely differ.
 *
 * The price grids are a parameter rather than a query, which is what keeps this
 * package free of react-query and of any one app's RPC client.
 */

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
	/** The recut's swing as a percentage — the line under `totalWas`. */
	totalDelta: string;
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

export function usePolishCalc(grids: PriceGrid[] | undefined) {
	const [shapeName, setShapeName] = useState("Round");
	const [caratText, setCaratText] = useState("1.00");
	// The top of both scales: every list publishes D and IF, so the opening stone
	// is priced rather than blank, and the wheels open at the row they show.
	const [color, setColor] = useState("d");
	const [clarity, setClarity] = useState("if");
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
	const [recutColor, setRecutColor] = useState("d");
	const [recutClarity, setRecutClarity] = useState("if");
	const [recutBackText, setRecutBackText] = useState("-25");

	const shape = findShape(shapeName);
	const grid = grids?.find((entry) => entry.shape === shape.list);

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
			// Already on a step: the ruler snaps before it emits, so rounding again
			// here would throw away the half percents it exists to select.
			const value = String(next);
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
			// Also asks for the keypad back: the tap that aims it is the only way
			// back once it has been dismissed, and aiming at a field the user cannot
			// type into would be a dead end. Here rather than in the screens because
			// every selector on both platforms routes through this.
			showKeypad();
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
		clarity: recut ? recutClarity : clarity,
		// The trade's scales stand in until the list lands: a rotor with no rows
		// in it reads as a stone with no colour and no clarity, which is what the
		// screen showed for as long as the price list took to arrive.
		clarityOptions: (grid?.clarities ?? CLARITIES).map(gradeOption),
		color: recut ? recutColor : color,
		colorOptions: (grid?.colors ?? COLORS).map(gradeOption),
		grid,
		guides,
		handleBackspace,
		handleClear,
		handleDigit,
		handleDiscount,
		handleDot,
		onClarity,
		onColor,
		onShape: setShapeName,
		readout,
		recut,
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
 * every string the card renders. Split out of the hook because it is pure
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
	const pct = (value: number) => (grid ? formatBack(value) : EMPTY);

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
			totalDelta: "",
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
	const { delta, deltaPct } = compareQuotes(base, after, baseCarat, afterCarat);
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
		totalDelta: totalDeltaFor(priced, afterCarat, deltaPct),
		totalRaw: (after.total || 0).toFixed(0),
		totalText: money(after.total, priced),
		// Recut opens with no weight, by design — until one is typed there is
		// nothing to compare, which is not the same as the grade being unpriced.
		totalWas: totalWasFor(
			priced,
			afterCarat,
			money(base.total, baseFound.perCarat !== null),
			delta,
			usd
		),
	};
}
