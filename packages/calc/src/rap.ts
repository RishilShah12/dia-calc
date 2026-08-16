import { useCallback, useEffect, useState } from "react";

import { useGuides } from "./guides";
import type { PriceGrid } from "./rap-calc";
import type { RAP_LISTS } from "./shapes";

/**
 * Which page of the Rapaport grid is on screen, and which cell the dealer has
 * picked out of it. No view: the table itself is drawn per platform — React
 * Native on the phones, a plain `<table>` on the web.
 */

/** Structurally `RapList` from `shapes`, spelled out to leave that name free. */
export type ListName = (typeof RAP_LISTS)[number];

export interface Picked {
	clarity: string;
	color: string;
}

export function useRapList(grids: PriceGrid[] | undefined) {
	const guides = useGuides();

	const [list, setList] = useState<ListName>("Round");
	const [bracketIndex, setBracketIndex] = useState(0);
	const [picked, setPicked] = useState<Picked | null>(null);

	const grid = grids?.find((entry) => entry.shape === list);
	const brackets = grid?.brackets ?? [];

	// Pear publishes fewer brackets than Round, so a switch can strand the
	// selection past the end of the new list.
	useEffect(() => {
		if (brackets.length && bracketIndex >= brackets.length) {
			setBracketIndex(brackets.length - 1);
		}
	}, [brackets.length, bracketIndex]);

	const handleList = useCallback((next: string) => {
		setList(next as ListName);
		setPicked(null);
	}, []);
	const handleBracket = useCallback((next: string) => {
		setBracketIndex(Number.parseInt(next, 10));
		setPicked(null);
	}, []);

	const safeIndex = Math.min(bracketIndex, Math.max(brackets.length - 1, 0));
	const prices = grid?.prices[safeIndex] ?? [];
	const pickedPrice =
		picked && grid
			? (prices[grid.colors.indexOf(picked.color)]?.[
					grid.clarities.indexOf(picked.clarity)
				] ?? null)
			: null;

	return {
		brackets,
		grid,
		guides,
		handleBracket,
		handleList,
		list,
		picked,
		pickedPrice,
		prices,
		safeIndex,
		setPicked,
	};
}
