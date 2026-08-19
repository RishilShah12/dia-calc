import { toggleGuides, useGuides } from "@dia-calc/calc/guides";
import {
	Drawer,
	type DrawerContentComponentProps,
	DrawerContentScrollView,
	DrawerItemList,
} from "expo-router/drawer";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Switch, Text, View } from "react-native";

import {
	ACCENT,
	type CalcPalette,
	ON_ACCENT,
	paletteFor,
	setDark,
	useScheme,
} from "@/components/calc-theme";

/**
 * The drawer reads the same palette the calculators do rather than
 * heroui-native's. The two genuinely disagree — heroui's light background is a
 * neutral #F5F5F5 against the calculator's warm #F6EEE6 — and a drawer sliding
 * out in a different shade of almost-white is exactly the kind of seam that
 * reads as a bug.
 */
const useCalcPalette = () => paletteFor(useScheme());

/**
 * `SymbolView` draws SF Symbols on iOS and Material Symbols on Android, but
 * only when it is handed the object form — a bare string resolves to `null` on
 * Android and renders the fallback, which is why these read as blank until the
 * `android` half is supplied. Hoisted so the objects are not rebuilt per render.
 */
const GUIDES_ICON = { android: "visibility", ios: "eye" } as const;
const DARK_ICON = { android: "dark_mode", ios: "moon" } as const;
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

/** The two setting rows under the routes, cut to the same measurements. */
function SettingRow({
	icon,
	label,
	onValueChange,
	palette,
	value,
}: {
	icon: SymbolViewProps["name"];
	label: string;
	onValueChange: (next: boolean) => void;
	palette: CalcPalette;
	value: boolean;
}) {
	return (
		<View style={styles.row}>
			<View style={styles.icon}>
				<SymbolView name={icon} size={22} tintColor={palette.primary} />
			</View>
			<Text style={[styles.label, { color: palette.primary }]}>{label}</Text>
			{/* Android draws the thumb from the Material scheme unless it is told
			    otherwise, which lands a teal knob on an amber track. */}
			<Switch
				accessibilityLabel={label}
				onValueChange={onValueChange}
				thumbColor={value ? ON_ACCENT : palette.surface}
				trackColor={{ false: palette.hairline, true: ACCENT }}
				value={value}
			/>
		</View>
	);
}

function DrawerContent(props: DrawerContentComponentProps) {
	const guides = useGuides();
	const scheme = useScheme();
	const palette = paletteFor(scheme);

	return (
		<DrawerContentScrollView {...props}>
			<DrawerItemList {...props} />
			{/* Settings, not destinations — so they get the control a setting gets,
			    and the labels stay nouns. A button labelled "Guides off" had to say
			    the state and the action in one line. */}
			<SettingRow
				icon={GUIDES_ICON}
				label="Guides"
				onValueChange={toggleGuides}
				palette={palette}
				value={guides}
			/>
			{/* Off means light rather than "follow the phone": once someone has
			    reached for this switch the system setting has been overruled, and a
			    control that silently handed the choice back would be a puzzle. */}
			<SettingRow
				icon={DARK_ICON}
				label="Dark mode"
				onValueChange={setDark}
				palette={palette}
				value={scheme === "dark"}
			/>
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
