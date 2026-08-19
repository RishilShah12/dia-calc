/**
 * The two comparison lines under a recut total.
 *
 * Their own module, and deliberately importing nothing — which is also why the
 * money formatter is handed in rather than reached for. `polish.ts` resolves
 * its siblings the way Metro does, without extensions, and Node's ESM loader
 * will not follow those; a module with no imports at all is one `node --test`
 * can load whatever the resolver thinks of the rest of the package. Formatting
 * money and a sign is worth keeping reachable that way: a dropped minus here
 * reads as a gain on a stone that lost value.
 */

const signed = (value: number, format: (n: number) => string) =>
	`${value >= 0 ? "+" : "−"}${format(Math.abs(value))}`;

/**
 * What the stone was worth, and what recutting it adds or takes off —
 * `was $73 + $32`.
 *
 * The sum, not the answer. The answer is already the number in orange directly
 * above, so spelling out `$105` again here would say nothing; what the dealer
 * cannot get from that number is the two terms behind it. In money rather than
 * percent because this line sits under a money figure and is read against it —
 * the percentage has its own line below.
 *
 * Recut deliberately starts with an empty weight, so "no price" would be wrong
 * the moment the mode is switched on: there is simply nothing to compare yet.
 * The empty string still holds its height, so the card does not resize once a
 * weight arrives.
 */
export function totalWasFor(
	priced: boolean,
	afterCarat: number,
	baseTotal: string,
	delta: number,
	money: (value: number) => string
): string {
	if (afterCarat <= 0) {
		return "";
	}
	if (!priced) {
		return "no price for that grade";
	}
	return `was ${baseTotal} ${delta < 0 ? "−" : "+"} ${money(Math.abs(delta))}`;
}

/**
 * The percentage the recut moves the total by, on its own line under the sum.
 *
 * Split off the "was" line rather than trailed after it: the two answer
 * different questions — what the stone gained, and whether that gain was worth
 * the weight it cost — and a dealer weighing two possible cuts reads the
 * percentages against each other, which is far easier when they are the only
 * thing on their line.
 */
export function totalDeltaFor(
	priced: boolean,
	afterCarat: number,
	deltaPct: number
): string {
	if (afterCarat <= 0 || !priced) {
		return "";
	}
	return signed(deltaPct, (n) => `${n.toFixed(1)}%`);
}
