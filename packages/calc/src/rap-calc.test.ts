import assert from "node:assert/strict";
import test from "node:test";

import {
	backFromNet,
	compareQuotes,
	lookupPrice,
	netFromBack,
	type PriceGrid,
	perCaratFromTotal,
	pricedBy,
	quote,
	summarizeRough,
} from "./rap-calc.ts";

/**
 * Mirrors the real list's awkward parts: a gap between 5.00-5.99 and
 * 10.00-10.99, and cells Rapaport does not publish.
 */
const grid: PriceGrid = {
	brackets: [
		[0.9, 0.99],
		[1.0, 1.49],
		[5.0, 5.99],
		[10.0, 10.99],
	],
	clarities: ["if", "vs1", "i3"],
	colors: ["d", "g"],
	date: "2026-08-07",
	prices: [
		[
			[6000, 4000, null],
			[4500, 3000, null],
		],
		[
			[12_000, 8000, 1500],
			[9000, 5400, 1200],
		],
		[
			[30_000, 20_000, 3000],
			[24_000, 16_000, 2400],
		],
		[
			[45_000, 30_000, 4500],
			[36_000, 24_000, 3600],
		],
	],
	shape: "Round",
};

test("0.99ct does not float up into the 1.00 bracket", () => {
	// Math.round(0.99 * 100) is fine, but the float-error guard matters here:
	// getting this wrong is a ~30% pricing error on a real stone.
	assert.equal(lookupPrice(grid, 0.99, "g", "vs1").perCarat, 3000);
	assert.equal(lookupPrice(grid, 1.0, "g", "vs1").perCarat, 5400);
});

test("matches the live list: Round 1.00-1.49 G VS1 is $5,400/ct", () => {
	const found = lookupPrice(grid, 1.05, "g", "vs1");
	assert.equal(found.perCarat, 5400);
	assert.deepEqual(found.bracket, [1.0, 1.49]);
	assert.equal(found.clamped, null);
});

test("weights in the 6.00-9.99 hole price off the bracket below, and say so", () => {
	const found = lookupPrice(grid, 7, "d", "if");
	assert.equal(found.clamped, "gap");
	assert.deepEqual(found.bracket, [5.0, 5.99]);
	assert.equal(found.perCarat, 30_000);
});

test("clamps outside the published range and reports the direction", () => {
	assert.equal(lookupPrice(grid, 0.5, "d", "if").clamped, "below");
	assert.equal(lookupPrice(grid, 15, "d", "if").clamped, "above");
	assert.equal(lookupPrice(grid, 15, "d", "if").perCarat, 45_000);
});

test("an unpublished cell is null, never NaN", () => {
	assert.equal(lookupPrice(grid, 0.95, "d", "i3").perCarat, null);
	assert.equal(lookupPrice(grid, 1.05, "d", "vvs2").perCarat, null);
});

test("a zero or negative weight has no bracket at all", () => {
	assert.equal(lookupPrice(grid, 0, "d", "if").bracketIndex, -1);
	assert.equal(lookupPrice(grid, -1, "d", "if").perCarat, null);
});

test("back and net solve in both directions", () => {
	assert.equal(netFromBack(10_000, -28), 7200);
	assert.equal(backFromNet(10_000, 7200), -28);

	const fromBack = quote(10_000, 1.02, { backPct: -28 });
	assert.equal(fromBack.netPerCarat, 7200);
	assert.equal(fromBack.total, 7344);

	assert.equal(quote(10_000, 1.02, { netPerCarat: 7200 }).backPct, -28);
});

test("a typed total back-solves the same discount as the price it implies", () => {
	// What the keypad does with a typed TOTAL: divide by the weight and quote
	// off the per-carat price, so the discount falls out of `backFromNet`.
	const q = quote(10_000, 1.5, { netPerCarat: 12_000 / 1.5 });
	assert.equal(q.backPct, -20);
	assert.equal(q.netPerCarat, 8000);
	assert.equal(q.total, 12_000);
});

test("a premium over list is expressible", () => {
	assert.equal(netFromBack(10_000, 5), 10_500);
});

test("a recut that loses weight but gains grade can still pay", () => {
	// 1.00ct G VS1 at -25 back, recut to 0.90ct D IF at the same back.
	const before = quote(3000, 1.0, { backPct: -25 });
	const after = quote(6000, 0.9, { backPct: -25 });

	const { delta, deltaPct, yieldPct } = compareQuotes(before, after, 1.0, 0.9);
	assert.equal(before.total, 2250);
	assert.equal(after.total, 4050);
	assert.equal(delta, 1800);
	assert.equal(deltaPct, 80);
	assert.equal(yieldPct, 90);
});

test("comparing against an unpriced stone reports 0%, never Infinity", () => {
	const before = quote(0, 1.0, { backPct: -25 });
	const after = quote(4000, 0.8, { backPct: -25 });

	const { delta, deltaPct, yieldPct } = compareQuotes(before, after, 1.0, 0.8);
	assert.equal(delta, 2400);
	assert.equal(deltaPct, 0);
	assert.equal(yieldPct, 80);

	// And no weight yet means no yield to speak of.
	assert.equal(compareQuotes(before, after, 0, 0).yieldPct, 0);
});

test("a rough is worth its parts, divided by what it weighed", () => {
	// The legacy app's own screen: a 99.9ct rough, part A 6.7ct off a $54,000
	// list at 31 back, part B making up the rest of the $310,707.
	const a = quote(54_000, 6.7, { backPct: -31 });
	assert.equal(a.netPerCarat, 37_260);
	assert.equal(Math.round(a.total), 249_642);

	const summary = summarizeRough(99.9, [
		{ carat: 6.7, total: a.total },
		{ carat: 14.7, total: 61_065 },
	]);
	assert.equal(Math.round(summary.total), 310_707);
	assert.equal(summary.perCarat.toFixed(2), "3110.18");
	assert.equal(summary.partsCarat.toFixed(1), "21.4");
	assert.equal(summary.yieldPct.toFixed(1), "21.4");
});

test("a rough with no parts yet is worth nothing, not NaN", () => {
	const summary = summarizeRough(99.9, []);
	assert.equal(summary.total, 0);
	assert.equal(summary.perCarat, 0);
	assert.equal(summary.yieldPct, 0);
});

test("parts against an unweighed rough report 0/ct, never Infinity", () => {
	// The state every session opens in: parts priced before the rough is weighed.
	const summary = summarizeRough(0, [{ carat: 6.7, total: 249_642 }]);
	assert.equal(summary.total, 249_642);
	assert.equal(summary.partsCarat, 6.7);
	assert.equal(summary.perCarat, 0);
	assert.equal(summary.yieldPct, 0);
});

test("pricedBy routes each edit target into the same two-field solve", () => {
	const fields = {
		backText: "-25",
		netText: "4050",
		totalText: "8100",
	};

	// The typed field is authoritative; the other side is derived by `quote`.
	assert.deepEqual(pricedBy({ ...fields, lastEdited: "back" }, 2), {
		backPct: -25,
	});
	assert.deepEqual(pricedBy({ ...fields, lastEdited: "net" }, 2), {
		netPerCarat: 4050,
	});
	// A typed total is a per-carat price the dealer hasn't divided yet.
	assert.deepEqual(pricedBy({ ...fields, lastEdited: "total" }, 2), {
		netPerCarat: 4050,
	});

	// Half-typed and empty buffers price at zero rather than NaN.
	assert.deepEqual(
		pricedBy({ ...fields, backText: "-", lastEdited: "back" }, 2),
		{
			backPct: 0,
		}
	);
	// No weight yet means no price yet — never a division by zero.
	assert.deepEqual(pricedBy({ ...fields, lastEdited: "total" }, 0), {
		netPerCarat: 0,
	});
	assert.equal(perCaratFromTotal(8100, 0), 0);
	assert.equal(perCaratFromTotal(8100, 2), 4050);
});
