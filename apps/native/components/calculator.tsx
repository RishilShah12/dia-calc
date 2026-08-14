import { Text, View } from "react-native";

/** Android fallback. The real screen is `calculator.ios.tsx`. */
export function Calculator() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">The calculator is iOS-only for now.</Text>
		</View>
	);
}
