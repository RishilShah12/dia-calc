/**
 * Every number a dealer sees comes out of this file. It is deliberately pure:
 * no React, no imports, no I/O, so it can be exercised by `rap-calc.test.ts`.
 */

export interface PriceGrid {
	brackets: [number, number][];
	clarities: string[];
	colors: string[];
	date: string;
	prices: (number | null)[][][];
	shape: string;
}

/** Why a weight isn't priced off its own bracket, or null when it is. */
export type Clamp = "below" | "above" | "gap" | null;

export interface Lookup {
	bracket: [number, number] | null;
	bracketIndex: number;
	clamped: Clamp;
	perCarat: number | null;
}

/**
 * Carat weights compare as integer hundredths, floored.
 *
 * Floor rather than round is load-bearing: `Math.round(0.995 * 100)` is 100,
 * which would price a 0.99ct stone off the 1.00-1.49 row — roughly a 30% error
 * on a real stone. The epsilon absorbs binary float error like 1.15 * 100
 * landing on 114.99999999999999.
 */
const hundredths = (carat: number) => Math.floor(carat * 100 + 1e-9);

/**
 * The bracket a weight is priced from.
 *
 * Rapaport's published brackets are not contiguous — there is a real gap
 * between 5.00-5.99 and 10.00-10.99, Pear starts at 0.18, and nothing is
 * published above 10.99. Rather than silently pricing a 7ct stone off the 5ct
 * row, we fall back to the nearest lower bracket and report why, so the UI can
 * say so out loud.
 */
export function findBracket(
	grid: PriceGrid,
	carat: number
): { index: number; clamped: Clamp } {
	const { brackets } = grid;
	if (brackets.length === 0 || !(carat > 0)) {
		return { clamped: null, index: -1 };
	}

	const target = hundredths(carat);

	for (const [index, [low, high]] of brackets.entries()) {
		if (target >= hundredths(low) && target <= hundredths(high)) {
			return { clamped: null, index };
		}
	}

	const [first] = brackets;
	const last = brackets.at(-1);
	if (!(first && last)) {
		return { clamped: null, index: -1 };
	}

	if (target < hundredths(first[0])) {
		return { clamped: "below", index: 0 };
	}
	if (target > hundredths(last[1])) {
		return { clamped: "above", index: brackets.length - 1 };
	}

	// Inside a hole between two published brackets: price off the nearest lower
	// one, which is the conservative direction.
	let fallback = 0;
	for (const [index, [low]] of brackets.entries()) {
		if (hundredths(low) <= target) {
			fallback = index;
		}
	}
	return { clamped: "gap", index: fallback };
}

export function lookupPrice(
	grid: PriceGrid,
	carat: number,
	color: string,
	clarity: string
): Lookup {
	const { index, clamped } = findBracket(grid, carat);
	if (index < 0) {
		return { bracket: null, bracketIndex: -1, clamped: null, perCarat: null };
	}

	const colorIndex = grid.colors.indexOf(color);
	const clarityIndex = grid.clarities.indexOf(clarity);
	const perCarat =
		colorIndex < 0 || clarityIndex < 0
			? null
			: (grid.prices[index]?.[colorIndex]?.[clarityIndex] ?? null);

	return {
		bracket: grid.brackets[index] ?? null,
		bracketIndex: index,
		clamped,
		perCarat,
	};
}

/**
 * `back` is signed the way the trade says it: -28 is "28 back", a 28% discount
 * off list. A positive value is a premium, which happens on genuinely scarce
 * goods.
 */
export const netFromBack = (listPerCarat: number, backPct: number) =>
	listPerCarat * (1 + backPct / 100);

/**
 * Rounded to two decimals, both because that is as fine as the trade ever
 * quotes a back and because the raw division produces float noise: a net of
 * 7200 against a list of 10000 otherwise reads as -28.000000000000004.
 *
 * Safe to round here because the field the dealer typed is always the source of
 * truth — only the other side of the pair is ever derived.
 */
export const backFromNet = (listPerCarat: number, netPerCarat: number) =>
	listPerCarat === 0
		? 0
		: Math.round((netPerCarat / listPerCarat - 1) * 10_000) / 100;

export interface Quote {
	backPct: number;
	listPerCarat: number;
	netPerCarat: number;
	total: number;
}

/**
 * Prices a stone from whichever side the dealer is working from — "what's 35
 * back?" and "he wants $4,000/ct, what back is that?" are the same question.
 *
 * Returns unrounded values; round at the display boundary only.
 */
export function quote(
	listPerCarat: number,
	carat: number,
	by: { backPct: number } | { netPerCarat: number }
): Quote {
	const netPerCarat =
		"netPerCarat" in by
			? by.netPerCarat
			: netFromBack(listPerCarat, by.backPct);
	const backPct =
		"backPct" in by ? by.backPct : backFromNet(listPerCarat, netPerCarat);
	return { backPct, listPerCarat, netPerCarat, total: netPerCarat * carat };
}

export interface Comparison {
	/** After minus before, in dollars. Negative means the recut loses money. */
	delta: number;
	/** `delta` as a percentage of the before total. */
	deltaPct: number;
	/** Weight kept, as a percentage. 82 means an 0.82ct came off a 1.00ct. */
	yieldPct: number;
}

/**
 * Is it worth recutting? The after-stone is quoted exactly like the before-stone
 * — this only subtracts, so there is no second pricing model to keep in step.
 *
 * A zero before-total (an unpriced grade, or no weight yet) yields 0% rather
 * than dividing by it, because "infinitely better" is not a useful answer.
 */
export function compareQuotes(
	before: Quote,
	after: Quote,
	beforeCarat: number,
	afterCarat: number
): Comparison {
	const delta = after.total - before.total;
	return {
		delta,
		deltaPct: before.total > 0 ? (delta / before.total) * 100 : 0,
		yieldPct:
			beforeCarat > 0 && afterCarat > 0 ? (afterCarat / beforeCarat) * 100 : 0,
	};
}

export interface RoughSummary {
	/** Σ of the part weights. Always less than the rough: sawing costs weight. */
	partsCarat: number;
	/** What the rough is worth per carat — the number the whole screen exists for. */
	perCarat: number;
	/** Σ of the part totals. */
	total: number;
	/** `partsCarat` as a percentage of the rough. 21 means a 99.9ct gave 21ct. */
	yieldPct: number;
}

/**
 * What a rough is worth: price every part as its own stone, add them up, and
 * divide by the weight of the rough they came out of.
 *
 * Parts are already-quoted stones, so there is no second pricing model here —
 * this only sums. A rough with no weight yet yields 0 rather than dividing by
 * it, for the same reason `compareQuotes` does.
 */
export function summarizeRough(
	roughCarat: number,
	parts: { carat: number; total: number }[]
): RoughSummary {
	let partsCarat = 0;
	let total = 0;
	for (const part of parts) {
		partsCarat += part.carat;
		total += part.total;
	}

	return {
		partsCarat,
		perCarat: roughCarat > 0 ? total / roughCarat : 0,
		total,
		yieldPct: roughCarat > 0 ? (partsCarat / roughCarat) * 100 : 0,
	};
}

const USD_WHOLE = new Intl.NumberFormat("en-US", {
	currency: "USD",
	maximumFractionDigits: 0,
	style: "currency",
});
const USD_CENTS = new Intl.NumberFormat("en-US", {
	currency: "USD",
	maximumFractionDigits: 2,
	minimumFractionDigits: 2,
	style: "currency",
});
const INR_WHOLE = new Intl.NumberFormat("en-IN", {
	currency: "INR",
	maximumFractionDigits: 0,
	style: "currency",
});

export const usd = (amount: number, cents = false) =>
	(cents ? USD_CENTS : USD_WHOLE).format(amount);

export const inr = (usdAmount: number, rate: number) =>
	INR_WHOLE.format(usdAmount * rate);

export const formatBracket = (bracket: [number, number]) =>
	`${bracket[0].toFixed(2)} – ${bracket[1].toFixed(2)} ct`;
