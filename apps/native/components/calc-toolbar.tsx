import { Stack, useNavigation } from "expo-router";
import { useCallback } from "react";

import { openProfile } from "@/lib/profile-sheet";

/**
 * The header buttons for both calculators, in the native toolbar rather than
 * drawn inside the SwiftUI tree.
 *
 * It has to be rendered from a screen rather than the layout: opening the
 * drawer means dispatching to the drawer navigator, and only a component below
 * it in the tree has that in its navigation context.
 *
 * `Stack.Toolbar.*` children must be wrapped by `Stack.Toolbar` in the same
 * component — a fragment of loose buttons does not register.
 */
export function CalcToolbar() {
	const navigation = useNavigation();
	const openDrawer = useCallback(() => {
		navigation.dispatch({ type: "OPEN_DRAWER" });
	}, [navigation]);

	return (
		<>
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button icon="line.3.horizontal" onPress={openDrawer} />
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button icon="person.crop.circle" onPress={openProfile} />
			</Stack.Toolbar>
		</>
	);
}
