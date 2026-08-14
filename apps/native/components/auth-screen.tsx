import { Text, View } from "react-native";

export type AuthMode = "sign-in" | "sign-up";

/** Android fallback. The real screen is `auth-screen.ios.tsx`. */
export function AuthScreen(_props: { mode: AuthMode }) {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">Sign in is iOS-only for now.</Text>
		</View>
	);
}
