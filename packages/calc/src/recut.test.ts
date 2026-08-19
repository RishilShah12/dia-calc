import assert from "node:assert/strict";
import test from "node:test";

import { usd } from "./rap-calc.ts";
import { totalDeltaFor, totalWasFor } from "./recut.ts";

/**
 * The recut comparison lines. Money and a sign, which is exactly the pair worth
 * pinning: a dropped minus here reads as a gain on a stone that lost value.
 */

test("the was line is the sum behind the total, not the total again", () => {
	assert.equal(totalWasFor(true, 0.9, "$73", 32, usd), "was $73 + $32");
	assert.equal(totalWasFor(true, 0.9, "$105", -32, usd), "was $105 − $32");
	// A recut that changes nothing still reads as a sum rather than a bare "was".
	assert.equal(totalWasFor(true, 0.9, "$73", 0, usd), "was $73 + $0");
});

test("no weight yet says nothing; a weight with no price says why", () => {
	// Recut opens with an empty weight — there is nothing to compare, and
	// "no price" would be a lie about the grade rather than about the stone.
	assert.equal(totalWasFor(true, 0, "$73", 32, usd), "");
	assert.equal(totalDeltaFor(true, 0, 43.8), "");
	assert.equal(
		totalWasFor(false, 0.9, "$73", 32, usd),
		"no price for that grade"
	);
	assert.equal(totalDeltaFor(false, 0.9, 43.8), "");
});

test("the percentage line carries its own sign", () => {
	assert.equal(totalDeltaFor(true, 0.9, 43.836), "+43.8%");
	assert.equal(totalDeltaFor(true, 0.9, -30.5), "−30.5%");
});
