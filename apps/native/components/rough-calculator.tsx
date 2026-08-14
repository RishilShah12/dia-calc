import { Text, View } from "react-native";

/** Android fallback. The real screen is `rough-calculator.ios.tsx`. */
export function RoughCalculator() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">
				The rough calculator is iOS-only for now.
			</Text>
		</View>
	);
}
