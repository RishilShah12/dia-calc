import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { paletteFor, useScheme } from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";
import { setProfileOpen, useProfileOpen } from "@/lib/profile-sheet";
import { orpc, queryClient } from "@/utils/orpc";

/**
 * The account sheet's wiring, shared by the SwiftUI and Compose sheets.
 *
 * All three screens mount a sheet, so this was already one copy of the
 * session-plus-query-plus-mutation setup serving three callers; making it a
 * hook just lets the second platform's sheet reuse it rather than repeat it.
 */

const HOUR = 60 * 60 * 1000;

export function useProfileSheet() {
	const scheme = useScheme();
	const palette = paletteFor(scheme);
	const isPresented = useProfileOpen();
	const { data: session } = authClient.useSession();

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: HOUR,
		})
	);
	const refresh = useMutation({
		mutationFn: () => orpc.priceList.get.call({ force: true }),
		onSuccess: (grids) => {
			queryClient.setQueryData(
				orpc.priceList.get.queryOptions({ input: { force: false } }).queryKey,
				grids
			);
		},
	});

	const close = useCallback(() => setProfileOpen(false), []);
	const handleRefresh = useCallback(() => refresh.mutate(), [refresh]);
	const handleSignOut = useCallback(async () => {
		setProfileOpen(false);
		await authClient.signOut();
		queryClient.clear();
	}, []);

	// Both lists carry the same date, so either one answers "how old is this".
	const listDate = priceList.data?.[0]?.date;

	return {
		close,
		/** No list on device at all, as against one that is merely stale. */
		failed: !(priceList.data?.length || priceList.isPending),
		handleRefresh,
		handleSignOut,
		isPresented,
		listDate,
		palette,
		refreshing: refresh.isPending,
		scheme,
		session,
		setProfileOpen,
	};
}
