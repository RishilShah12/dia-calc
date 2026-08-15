import { Redirect, Stack } from "expo-router";
import { useColorScheme } from "react-native";

import { ACCENT, paletteFor } from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";

/**
 * The `Stack` both calculators sit in, and the gate in front of them.
 *
 * The Stack is what gives each screen a real `UINavigationBar` — the drawer's
 * own header is drawn in JS — and it is what `Stack.Toolbar` in the screens
 * binds to. Each calculator gets its own group and its own one-line layout
 * calling this, rather than a shared `(polish,rough)` group: that syntax
 * duplicates the *files beside it* into both groups, which only works when the
 * screens are identical, and these two render different calculators.
 *
 * Gated twice, same as the web route: this check, and `protectedProcedure` on
 * `priceList.get` itself. The Rapaport list is copyrighted and subscriber-only,
 * so it must never reach an anonymous request.
 */
export function CalcStack({ title }: { title: string }) {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);
	const { data: session, isPending } = authClient.useSession();

	// Redirecting while the stored session is still being read would bounce a
	// signed-in user out to the auth screen on every cold start.
	if (isPending) {
		return null;
	}

	if (!session?.user) {
		return <Redirect href="/sign-in" />;
	}

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
