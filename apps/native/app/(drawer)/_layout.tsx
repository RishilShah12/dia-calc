import {
	Drawer,
	type DrawerContentComponentProps,
	DrawerContentScrollView,
	DrawerItemList,
} from "expo-router/drawer";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Switch, Text, useColorScheme, View } from "react-native";

import { ACCENT, paletteFor } from "@/components/calc-theme";
import { toggleGuides, useGuides } from "@/lib/guides";

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
					<SymbolView name="eye" size={22} tintColor={palette.primary} />
				</View>
				<Text style={[styles.label, { color: palette.primary }]}>Guides</Text>
				<Switch
					accessibilityLabel="Guides"
					onValueChange={toggleGuides}
					trackColor={{ true: ACCENT }}
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
						<SymbolView name="diamond" size={size} tintColor={color} />
					),
					drawerLabel: "Polish",
				}}
			/>
			<Drawer.Screen
				name="(rough)"
				options={{
					drawerIcon: ({ size, color }) => (
						<SymbolView name="cube" size={size} tintColor={color} />
					),
					drawerLabel: "Rough",
				}}
			/>
			<Drawer.Screen
				name="(rap)"
				options={{
					drawerIcon: ({ size, color }) => (
						<SymbolView name="tablecells" size={size} tintColor={color} />
					),
					drawerLabel: "Rap List",
				}}
			/>
		</Drawer>
	);
}

export default DrawerLayout;
