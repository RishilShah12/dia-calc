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
