"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc, queryClient } from "@/utils/orpc";

/**
 * The Rapaport grids, and the one action that can replace them.
 *
 * Every screen needs the list and the sidebar needs its date, so the query lives
 * here rather than being spelled out four times. The refresh writes its result
 * straight into the unforced query's cache, so the screens re-render off the new
 * grids without a second round trip.
 */

const HOUR = 60 * 60 * 1000;

const listOptions = orpc.priceList.get.queryOptions({
	input: { force: false },
	staleTime: HOUR,
});

export function usePriceList() {
	const priceList = useQuery(listOptions);

	const refresh = useMutation({
		mutationFn: () => orpc.priceList.get.call({ force: true }),
		onSuccess: (grids) => {
			queryClient.setQueryData(listOptions.queryKey, grids);
		},
	});

	return {
		/** No list at all, as against one that is merely stale. */
		failed: !(priceList.data?.length || priceList.isPending),
		grids: priceList.data,
		isPending: priceList.isPending,
		// Both lists carry the same date, so either one answers "how old is this".
		listDate: priceList.data?.[0]?.date,
		refresh: refresh.mutate,
		refreshing: refresh.isPending,
	};
}
