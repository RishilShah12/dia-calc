import assert from "node:assert/strict";
import test from "node:test";

import {
	backFromNet,
	lookupPrice,
	netFromBack,
	type PriceGrid,
	quote,
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

test("a premium over list is expressible", () => {
	assert.equal(netFromBack(10_000, 5), 10_500);
});
