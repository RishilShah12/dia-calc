/**
 * There are only two Rapaport price lists: Round, and fancy. Every shape that
 * is not round shares the one fancy list, which the API calls `Pear`.
 *
 * Asking for anything else is rejected outright — `shape=Princess` returns
 * HTTP 400, "The value 'Princess' is not valid." Rapaport's own fancy sheet
 * carries footnotes for Cushions, Emeralds, Princesses, Asschers, Radiants,
 * Marquises and Hearts for exactly this reason: one list covers them all.
 *
 * So the shapes below are the dealer's vocabulary, not extra price data. An
 * Oval and a Cushion of the same weight and grade carry the same Rap — picking
 * between them records what is in your hand, it does not change the number.
 *
 * There is deliberately no per-shape adjustment baked in. Rapaport publishes
 * those as weekly commentary rather than as data and they move with the market,
 * so a dealer expresses them in the back %. Hard-coding one would be inventing
 * a price.
 */

export const RAP_LISTS = ["Round", "Pear"] as const;
export type RapList = (typeof RAP_LISTS)[number];

/** The API's shape key for the fancy list is `Pear`; the trade calls it fancy. */
export const listLabel = (list: RapList) =>
	list === "Round" ? "Round" : "Fancy";

export interface Shape {
	abbr: string;
	list: RapList;
	name: string;
}

export const SHAPES: Shape[] = [
	{ abbr: "BR", list: "Round", name: "Round" },
	{ abbr: "PS", list: "Pear", name: "Pear" },
	{ abbr: "OV", list: "Pear", name: "Oval" },
	{ abbr: "MQ", list: "Pear", name: "Marquise" },
	{ abbr: "HT", list: "Pear", name: "Heart" },
	{ abbr: "CU", list: "Pear", name: "Cushion" },
	{ abbr: "PR", list: "Pear", name: "Princess" },
	{ abbr: "EM", list: "Pear", name: "Emerald" },
	{ abbr: "AS", list: "Pear", name: "Asscher" },
	{ abbr: "RAD", list: "Pear", name: "Radiant" },
	{ abbr: "TR", list: "Pear", name: "Trilliant" },
	{ abbr: "BAG", list: "Pear", name: "Baguette" },
];

export const findShape = (name: string): Shape =>
	SHAPES.find((s) => s.name === name) ?? (SHAPES[0] as Shape);

/**
 * The grading scales, best grade first — what the wheels show until a price list
 * says otherwise.
 *
 * The published grid is still the authority on which grades a given list
 * carries: Round and Pear disagree, and colour N appears only under 0.30ct. But
 * the grid arrives over the network, and a rotor with nothing in it is a rotor
 * that says the stone has no colour and no clarity. These are the scales the
 * trade uses; showing them costs nothing and is never wrong about the grade the
 * dealer is holding, only about whether Rapaport prints a price for it.
 *
 * Same order as the server sorts a grid into, so the wheel does not reshuffle
 * under the thumb when the list lands.
 */
export const COLORS = ["d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
export const CLARITIES = [
	"if",
	"vvs1",
	"vvs2",
	"vs1",
	"vs2",
	"si1",
	"si2",
	"si3",
	"i1",
	"i2",
	"i3",
];
