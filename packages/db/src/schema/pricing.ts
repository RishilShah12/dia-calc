import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type RapShape = "Round" | "Pear";

/**
 * The Rapaport price list for one shape, compacted into a dense lookup grid.
 *
 * The raw API returns ~2000 flat rows per shape; folded into `prices` that is
 * ~11KB of JSON, so the whole list fits in a single D1 row and a single
 * response to the browser. `prices` is indexed [bracket][color][clarity].
 *
 * `brackets` and `colors` are derived from the API response, never hardcoded:
 * Round publishes 18 size brackets and Pear only 14, and color N exists only
 * in the brackets below 0.30ct.
 */
export interface PriceGrid {
	/** Size brackets as [low, high] carat weights, ascending. */
	brackets: [number, number][];
	/** Lowercase clarity grades, best first: if, vvs1, … */
	clarities: string[];
	/** Lowercase color grades, best first: d, e, f, … */
	colors: string[];
	/** Publication date of the list, ISO `YYYY-MM-DD`. */
	date: string;
	/** Price per carat in USD, or null where the list has no cell. */
	prices: (number | null)[][][];
	shape: RapShape;
}

export const rapPriceList = sqliteTable("rap_price_list", {
	fetchedAt: integer("fetched_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	grid: text("grid", { mode: "json" }).$type<PriceGrid>().notNull(),
	listDate: text("list_date").notNull(),
	shape: text("shape").$type<RapShape>().primaryKey(),
});
