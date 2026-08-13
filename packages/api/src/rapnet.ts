import type { PriceGrid, RapShape } from "@dia-calc/db/schema/pricing";
import { env } from "@dia-calc/env/server";

const TOKEN_URL = "https://authztoken.api.rapaport.com/api/get";
const PRICE_LIST_URL =
	"https://technet.rapnetapis.com/pricelist/api/Prices/list";

/** The only two shapes Rapaport publishes a list for. */
export const SHAPES: RapShape[] = ["Round", "Pear"];

/**
 * Grading scales, best grade first. These are the sort order for the grid, not
 * a filter: brackets and colours are still derived from the response, because
 * Round publishes 18 size brackets to Pear's 14 and colour N appears only in
 * the brackets below 0.30ct.
 */
const COLOR_ORDER = ["d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
const CLARITY_ORDER = [
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

interface PriceRow {
	caratprice: string | number;
	clarity: string;
	color: string;
	date: string;
	high_size: number;
	low_size: number;
	shape: string;
}

/** Sorts by grading scale, parking anything unrecognised at the end. */
function byGrade(order: string[]) {
	return (a: string, b: string) => {
		const ai = order.indexOf(a);
		const bi = order.indexOf(b);
		return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
	};
}

/** Folds ~2000 flat rows into a dense [bracket][color][clarity] grid. */
export function buildGrid(shape: RapShape, rows: PriceRow[]): PriceGrid {
	const brackets = [...new Set(rows.map((r) => `${r.low_size}|${r.high_size}`))]
		.map((key) => key.split("|").map(Number) as [number, number])
		.sort((a, b) => a[0] - b[0]);

	const colors = [...new Set(rows.map((r) => r.color.toLowerCase()))].sort(
		byGrade(COLOR_ORDER)
	);
	const clarities = [...new Set(rows.map((r) => r.clarity.toLowerCase()))].sort(
		byGrade(CLARITY_ORDER)
	);

	const bracketIndex = new Map(brackets.map((b, i) => [`${b[0]}|${b[1]}`, i]));
	const colorIndex = new Map(colors.map((c, i) => [c, i]));
	const clarityIndex = new Map(clarities.map((c, i) => [c, i]));

	// Null-filled: Rapaport does not publish every combination, so a missing
	// cell has to stay distinguishable from a zero price.
	const prices: (number | null)[][][] = brackets.map(() =>
		colors.map(() => clarities.map(() => null))
	);

	for (const row of rows) {
		const b = bracketIndex.get(`${row.low_size}|${row.high_size}`);
		const c = colorIndex.get(row.color.toLowerCase());
		const cl = clarityIndex.get(row.clarity.toLowerCase());
		if (b === undefined || c === undefined || cl === undefined) {
			continue;
		}
		const bracket = prices[b];
		const color = bracket?.[c];
		if (color) {
			color[cl] = Number(row.caratprice);
		}
	}

	return {
		brackets,
		clarities,
		colors,
		date: rows[0]?.date ?? "",
		prices,
		shape,
	};
}

async function getAccessToken(): Promise<string> {
	const response = await fetch(TOKEN_URL, {
		body: JSON.stringify({
			client_id: env.RAPNET_CLIENT_ID,
			client_secret: env.RAPNET_CLIENT_SECRET,
		}),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	// Bad credentials come back as HTTP 500, not 401, so a 5xx here is a config
	// error rather than something worth retrying.
	if (!response.ok) {
		throw new Error(
			`Rapaport auth failed (${response.status}): ${await response.text()}`
		);
	}

	const json = (await response.json()) as { access_token?: string };
	if (!json.access_token) {
		throw new Error("Rapaport auth returned no access_token");
	}
	return json.access_token;
	// ponytail: no token cache. The token is only needed on the sync path, which
	// runs about once a day. Cache it in a module global if that ever changes.
}

/** Fetches both shapes' lists on one token. */
export async function fetchAllGrids(): Promise<PriceGrid[]> {
	const token = await getAccessToken();
	const headers = {
		Accept: "application/json",
		Authorization: `Bearer ${token}`,
	};

	return await Promise.all(
		SHAPES.map(async (shape) => {
			const response = await fetch(
				`${PRICE_LIST_URL}?shape=${shape}&csvnormalized=true`,
				{ headers }
			);
			if (!response.ok) {
				throw new Error(
					`Rapaport price list for ${shape} failed (${response.status})`
				);
			}
			const rows = (await response.json()) as PriceRow[];
			if (rows.length === 0) {
				throw new Error(`Rapaport returned an empty price list for ${shape}`);
			}
			return buildGrid(shape, rows);
		})
	);
}
