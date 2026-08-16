import { useRoughCalc as useRoughState } from "@dia-calc/calc/rough";
import { useQuery } from "@tanstack/react-query";
import { useColorScheme } from "react-native";

import { paletteFor, type Scheme } from "@/components/calc-theme";
import { orpc } from "@/utils/orpc";

/**
 * As with `use-polish-calc`: the rough planner's state machine is shared in
 * `@dia-calc/calc`, and what stays here is the query and the palette. The parts
 * helpers the screens draw with — `money`, `pct`, `partLabel` — come straight
 * from `@dia-calc/calc/rough`, since re-exporting them through this file would
 * only add a hop.
 */

const HOUR = 60 * 60 * 1000;

export function useRoughCalc() {
	const scheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: HOUR,
		})
	);

	return {
		...useRoughState(priceList.data),
		palette,
		scheme,
	};
}
