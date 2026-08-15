import { Text, View } from "react-native";

/** Android fallback. The real screen is `rap-list.ios.tsx`. */
export function RapList() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-muted">The Rap list is iOS-only for now.</Text>
		</View>
	);
}
