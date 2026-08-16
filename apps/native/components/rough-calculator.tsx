import { Text, View } from "react-native";

/**
 * Web fallback. Both native platforms have a real screen — `rough-calculator.ios.tsx`
 * in SwiftUI and `rough-calculator.android.tsx` in Jetpack Compose — and Metro
 * prefers either over this file. It stays because it is what TypeScript
 * resolves `@/components/rough-calculator` to, and what `expo start --web` renders.
 *
 * The calculator proper lives on the web in `apps/web`.
 */
export function RoughCalculator() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">
				The rough calculator is on iOS and Android. Use the web app in a
				browser.
			</Text>
		</View>
	);
}
