import { Stack, useNavigation } from "expo-router";
import { unstable_getMaterialSymbolSourceAsync } from "expo-symbols";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { ACCENT } from "@/components/calc-theme";
import { openProfile } from "@/lib/profile-sheet";

/**
 * The header buttons for all three screens, in the native toolbar rather than
 * drawn inside the platform UI tree.
 *
 * It has to be rendered from a screen rather than the layout: opening the
 * drawer means dispatching to the drawer navigator, and only a component below
 * it in the tree has that in its navigation context.
 *
 * `Stack.Toolbar.*` children must be wrapped by `Stack.Toolbar` in the same
 * component — a fragment of loose buttons does not register.
 *
 * `placement="left"`/`"right"` maps to real header buttons on both platforms —
 * a `UIBarButtonItem` on iOS, and `headerLeft`/`headerRight` holding a Compose
 * `Row` on Android. Only `placement="bottom"` is the floating toolbar, which
 * would sit on top of the keypad.
 */

/** Both derived from the APIs they feed, so a bad name fails to compile. */
type ToolbarIcon = NonNullable<
	ComponentProps<typeof Stack.Toolbar.Button>["icon"]
>;
type MaterialSymbol = Parameters<
	typeof unstable_getMaterialSymbolSourceAsync
>[0];

interface IconPair {
	android: MaterialSymbol;
	ios: ToolbarIcon;
}

const MENU: IconPair = { android: "menu", ios: "line.3.horizontal" };
const PROFILE: IconPair = {
	android: "account_circle",
	ios: "person.crop.circle",
};

/**
 * Android's toolbar draws an image, not a symbol name — an SF Symbol string is
 * dropped with a warning. Material Symbols are a font, so the glyph has to be
 * rendered to an image source first, which is async and therefore a frame late.
 */
function useToolbarIcon(icon: IconPair): ToolbarIcon | undefined {
	const [source, setSource] = useState<ToolbarIcon>();

	useEffect(() => {
		if (Platform.OS !== "android") {
			return;
		}
		let cancelled = false;
		unstable_getMaterialSymbolSourceAsync(icon.android, 24, ACCENT).then(
			(next) => {
				if (!cancelled && next) {
					setSource(next);
				}
			}
		);
		return () => {
			cancelled = true;
		};
	}, [icon.android]);

	return Platform.OS === "android" ? source : icon.ios;
}

export function CalcToolbar() {
	const navigation = useNavigation();
	const openDrawer = useCallback(() => {
		navigation.dispatch({ type: "OPEN_DRAWER" });
	}, [navigation]);

	const menuIcon = useToolbarIcon(MENU);
	const profileIcon = useToolbarIcon(PROFILE);

	// The Android button warns and renders nothing without a source, so hold the
	// whole toolbar back for the frame it takes to rasterise rather than mount a
	// button that is guaranteed to be empty.
	if (!(menuIcon && profileIcon)) {
		return null;
	}

	return (
		<>
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button
					accessibilityLabel="Menu"
					icon={menuIcon}
					onPress={openDrawer}
				/>
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel="Account"
					icon={profileIcon}
					onPress={openProfile}
				/>
			</Stack.Toolbar>
		</>
	);
}
