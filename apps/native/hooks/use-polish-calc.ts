import { usePolishCalc as usePolishState } from "@dia-calc/calc/polish";
import { useQuery } from "@tanstack/react-query";
import { useColorScheme } from "react-native";

import { ACCENT, paletteFor, type Scheme } from "@/components/calc-theme";
import { orpc } from "@/utils/orpc";

/**
 * The polish screen's state machine lives in `@dia-calc/calc` so the two native
 * views and the web one price a stone through a single implementation. What is
 * left here is the part that is genuinely native: the price-list query, and the
 * palette the SwiftUI and Compose trees paint with.
 */

const HOUR = 60 * 60 * 1000;

export function usePolishCalc() {
	const scheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: HOUR,
		})
	);

	const calc = usePolishState(priceList.data);

	return {
		...calc,
		// All three wheels share one caption colour; recut is a property of the
		// stone being priced, not of one wheel.
		captionColor: calc.recut ? ACCENT : palette.label,
		isPending: priceList.isPending,
		palette,
		scheme,
	};
}
