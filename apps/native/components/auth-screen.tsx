import { Text, View } from "react-native";

export type AuthMode = "sign-in" | "sign-up";

/**
 * Web fallback — see the note in `calculator.tsx`. The real screens are
 * `auth-screen.ios.tsx` and `auth-screen.android.tsx`.
 */
export function AuthScreen(_props: { mode: AuthMode }) {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">
				Sign in is on iOS and Android. Use the web app in a browser.
			</Text>
		</View>
	);
}
