import { toggleGuides, useGuides } from "@dia-calc/calc/guides";
import {
	Drawer,
	type DrawerContentComponentProps,
	DrawerContentScrollView,
	DrawerItemList,
} from "expo-router/drawer";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Switch, Text, useColorScheme, View } from "react-native";

import { ACCENT, ON_ACCENT, paletteFor } from "@/components/calc-theme";

/**
 * The drawer reads the same palette the calculators do rather than
 * heroui-native's. The two genuinely disagree — heroui's light background is a
 * neutral #F5F5F5 against the calculator's warm #F6EEE6 — and a drawer sliding
 * out in a different shade of almost-white is exactly the kind of seam that
 * reads as a bug.
 */
const useCalcPalette = () =>
	paletteFor(useColorScheme() === "dark" ? "dark" : "light");

/**
 * `SymbolView` draws SF Symbols on iOS and Material Symbols on Android, but
 * only when it is handed the object form — a bare string resolves to `null` on
 * Android and renders the fallback, which is why these read as blank until the
 * `android` half is supplied. Hoisted so the objects are not rebuilt per render.
 */
const GUIDES_ICON = { android: "visibility", ios: "eye" } as const;
const POLISH_ICON = { android: "diamond", ios: "diamond" } as const;
const ROUGH_ICON = { android: "deployed_code", ios: "cube" } as const;
const RAP_ICON = { android: "table_chart", ios: "tablecells" } as const;

/**
 * Cut to react-navigation's own `DrawerItem` so this row lines up with the
 * three routes above it: same 12pt outer margin, same glyph gutter, same
 * 15pt/500 label.
 */
const styles = StyleSheet.create({
	/** A fixed gutter, so the label starts where the routes' labels do rather
	    than wherever this particular glyph happens to end. */
	icon: { alignItems: "center", width: 24 },
	label: { flex: 1, fontSize: 15, fontWeight: "500" },
	row: {
		alignItems: "center",
		flexDirection: "row",
		gap: 12,
		marginHorizontal: 10,
		paddingHorizontal: 7,
		paddingVertical: 10,
	},
});

function DrawerContent(props: DrawerContentComponentProps) {
	const guides = useGuides();
	const palette = useCalcPalette();

	return (
		<DrawerContentScrollView {...props}>
			<DrawerItemList {...props} />
			{/* Guides is a setting, not a destination — so it gets the control a
			    setting gets, and the label stays the noun. A button labelled
			    "Guides off" had to say the state and the action in one line. */}
			<View style={styles.row}>
				<View style={styles.icon}>
					<SymbolView
						name={GUIDES_ICON}
						size={22}
						tintColor={palette.primary}
					/>
				</View>
				<Text style={[styles.label, { color: palette.primary }]}>Guides</Text>
				{/* Android draws the thumb from the Material scheme unless it is told
				    otherwise, which lands a teal knob on an amber track. */}
				<Switch
					accessibilityLabel="Guides"
					onValueChange={toggleGuides}
					thumbColor={guides ? ON_ACCENT : palette.surface}
					trackColor={{ false: palette.hairline, true: ACCENT }}
					value={guides}
				/>
			</View>
		</DrawerContentScrollView>
	);
}

function DrawerLayout() {
	const palette = useCalcPalette();

	return (
		<Drawer
			drawerContent={DrawerContent}
			screenOptions={{
				// The tint props do the colouring that the label render functions
				// used to hand-roll, back when the drawer was on a palette whose
				// active colour was react-navigation's default blue.
				drawerActiveTintColor: ACCENT,
				drawerInactiveTintColor: palette.primary,
				drawerStyle: { backgroundColor: palette.background },
				headerShown: false,
				// The calculator fills the screen edge to edge; an edge swipe would
				// fight the wheels and the slider, so the button is the only way in.
				swipeEnabled: false,
			}}
		>
			<Drawer.Screen
				name="(polish)"
				options={{
					drawerIcon: ({ size, color }) => (
						<SymbolView name={POLISH_ICON} size={size} tintColor={color} />
					),
					drawerLabel: "Polish",
				}}
			/>
			<Drawer.Screen
				name="(rough)"
				options={{
					drawerIcon: ({ size, color }) => (
						<SymbolView name={ROUGH_ICON} size={size} tintColor={color} />
					),
					drawerLabel: "Rough",
				}}
			/>
			<Drawer.Screen
				name="(rap)"
				options={{
					drawerIcon: ({ size, color }) => (
						<SymbolView name={RAP_ICON} size={size} tintColor={color} />
					),
					drawerLabel: "Rap List",
				}}
			/>
		</Drawer>
	);
}

export default DrawerLayout;
