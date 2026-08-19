import { Stack } from "expo-router";

import { ACCENT, paletteFor, useScheme } from "@/components/calc-theme";

/**
 * The `Stack` all three calculator screens sit in.
 *
 * The Stack is what gives each screen a real navigation bar — the drawer's own
 * header is drawn in JS — and it is what `Stack.Toolbar` in the screens binds
 * to. Each calculator gets its own group and its own one-line layout calling
 * this, rather than a shared `(polish,rough)` group: that syntax duplicates the
 * files beside it into both groups, which only works when the screens are
 * identical, and these two render different calculators.
 *
 * No auth check here any more — the root layout guards `(drawer)` with
 * `Stack.Protected`, so nothing below it can render signed out. The gate that
 * actually matters is `protectedProcedure` on `priceList.get`: the Rapaport
 * list is copyrighted and subscriber-only, so it must never reach an anonymous
 * request, and a client-side check was never what enforced that.
 */
export function CalcStack({ title }: { title: string }) {
	const scheme = useScheme();
	const palette = paletteFor(scheme);

	return (
		<Stack
			screenOptions={{
				headerShadowVisible: false,
				headerStyle: { backgroundColor: palette.background },
				headerTintColor: ACCENT,
				headerTitleStyle: { color: palette.primary },
				title,
			}}
		/>
	);
}
