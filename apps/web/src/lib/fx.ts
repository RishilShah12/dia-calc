const FX_URL =
	"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json";

export interface FxRate {
	date: string;
	inr: number;
}

/**
 * USD→INR straight from the CDN — it serves `access-control-allow-origin: *`,
 * so this needs no server route of its own.
 *
 * ponytail: the `@latest` URL ships `cache-control: max-age=604800`, so a
 * browser can hold a rate for up to a week. That is why the panel lets a dealer
 * type their own rate over it; most work to their bank's number anyway.
 */
export const fxQueryOptions = {
	queryFn: async (): Promise<FxRate> => {
		const response = await fetch(FX_URL);
		if (!response.ok) {
			throw new Error("USD/INR rate unavailable");
		}
		const json = (await response.json()) as {
			date: string;
			usd: Record<string, number | undefined>;
		};
		return { date: json.date, inr: json.usd.inr ?? 0 };
	},
	queryKey: ["fx", "usd-inr"] as const,
	staleTime: 12 * 60 * 60 * 1000,
};
