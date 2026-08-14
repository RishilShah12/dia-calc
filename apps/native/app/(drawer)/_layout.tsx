import {
	Drawer,
	type DrawerContentComponentProps,
	DrawerContentScrollView,
	DrawerItem,
	DrawerItemList,
} from "expo-router/drawer";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Text } from "react-native";
import { toggleGuides, useGuides } from "@/lib/guides";

function DrawerContent(props: DrawerContentComponentProps) {
	const guides = useGuides();
	const themeColorForeground = useThemeColor("foreground");

	const guidesIcon = useCallback(
		({ size }: { size: number }) => (
			<SymbolView
				name={guides ? "eye" : "eye.slash"}
				size={size}
				tintColor={themeColorForeground}
			/>
		),
		[guides, themeColorForeground]
	);

	return (
		<DrawerContentScrollView {...props}>
			<DrawerItemList {...props} />
			<DrawerItem
				icon={guidesIcon}
				label={guides ? "Guides on" : "Guides off"}
				labelStyle={{ color: themeColorForeground }}
				onPress={toggleGuides}
			/>
		</DrawerContentScrollView>
	);
}

function DrawerLayout() {
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

	return (
		<Drawer
			drawerContent={DrawerContent}
			screenOptions={{
				drawerStyle: { backgroundColor: themeColorBackground },
				headerShown: false,
				// The calculator fills the screen edge to edge; an edge swipe would
				// fight the wheels and the slider, so the button is the only way in.
				swipeEnabled: false,
			}}
		>
			{/* "Calculator" would be ambiguous now that there are two of them. */}
			<Drawer.Screen
				name="index"
				options={{
					drawerIcon: ({ size, color, focused }) => (
						<SymbolView
							name="diamond"
							size={size}
							tintColor={focused ? color : themeColorForeground}
						/>
					),
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : themeColorForeground }}>
							Polish
						</Text>
					),
				}}
			/>
			<Drawer.Screen
				name="rough"
				options={{
					drawerIcon: ({ size, color, focused }) => (
						<SymbolView
							name="cube"
							size={size}
							tintColor={focused ? color : themeColorForeground}
						/>
					),
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : themeColorForeground }}>
							Rough
						</Text>
					),
				}}
			/>
		</Drawer>
	);
}

export default DrawerLayout;
