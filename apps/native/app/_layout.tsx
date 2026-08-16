import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

/**
 * The auth gate, as a pair of guarded groups rather than a redirect.
 *
 * `Stack.Protected` drops a screen out of the navigator's route names when its
 * guard goes false, and React Navigation then pops it and clears its history.
 * So signing in removes `(auth)` and reveals `(drawer)`, and signing out does
 * the reverse — neither needs a `router` call anywhere.
 *
 * The redirect this replaces could not do that: firing `<Redirect>` from a
 * layout *inside* `(drawer)` replaced `(drawer)` on the root stack, which
 * unmounted the very component holding the session subscription — so when the
 * session flipped there was nothing left listening to navigate back.
 *
 * Guarded on the session data rather than on `isPending`. `@better-auth/expo`
 * seeds the session atom from SecureStore's *synchronous* `getItem` while the
 * client module is still evaluating, so a returning user is already signed in
 * on the first frame. Waiting for `isPending` would add a blank frame rather
 * than remove one.
 *
 * `(drawer)` stays the first child: it is what `routeNames[0]` resolves to, and
 * therefore what the stack falls back to once `(auth)` is filtered out.
 */
function RootNavigator() {
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	return (
		<Stack>
			<Stack.Protected guard={signedIn}>
				<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
			</Stack.Protected>
			<Stack.Protected guard={!signedIn}>
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			</Stack.Protected>
			<Stack.Screen
				name="modal"
				options={{ presentation: "modal", title: "Modal" }}
			/>
		</Stack>
	);
}

export default function Layout() {
	return (
		<QueryClientProvider client={queryClient}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<KeyboardProvider>
					<AppThemeProvider>
						<HeroUINativeProvider>
							<RootNavigator />
						</HeroUINativeProvider>
					</AppThemeProvider>
				</KeyboardProvider>
			</GestureHandlerRootView>
		</QueryClientProvider>
	);
}
