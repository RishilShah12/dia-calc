import { useSyncExternalStore } from "react";
import { Platform, useColorScheme } from "react-native";

/**
 * Palette for the calculator and auth screens.
 *
 * The SwiftUI tree can't read Uniwind classes, so the handful of colours the
 * design actually names live here as plain hex. Everything else — control
 * chrome, glass tint, separators — is left to SwiftUI's own semantic colours so
 * it tracks the system appearance for free.
 */

export const ACCENT = "#E8913A";
/** Sits on solid accent in both appearances, so it never follows the scheme. */
export const ON_ACCENT = "#FFFFFF";

export interface CalcPalette {
	/** Screen background behind the glass. */
	background: string;
	/** Rules that separate without drawing attention: table borders, row splits. */
	hairline: string;
	/** Ink on a glass key. Must follow the appearance or it vanishes. */
	keyLabel: string;
	/** Small uppercase captions: CARAT, RAP LIST, DISCOUNT OFF LIST. */
	label: string;
	/** Body/primary numerals. */
	primary: string;
	/**
	 * "was $5,400" under a recut value. Quiet in tone but not in weight — in
	 * recut mode these lines are the comparison, so they read nearly as dark as
	 * the numeral they sit under.
	 */
	subtext: string;
	/** Furniture that must not compete: slider end labels, a part's grade line. */
	subtle: string;
	/**
	 * A raised surface sitting on `background` — a grouped list's rows, a
	 * table's field. iOS supplies its own grouped grey, which clashes with the
	 * cream this app is built on.
	 */
	surface: string;
}

const LIGHT: CalcPalette = {
	background: "#F6EEE6",
	hairline: "#E4D9CC",
	keyLabel: "#1C1917",
	label: "#8C8378",
	primary: "#1C1917",
	subtext: "#3A342E",
	subtle: "#A79C90",
	surface: "#FFFBF7",
};

const DARK: CalcPalette = {
	background: "#0C0A09",
	hairline: "#2E2926",
	keyLabel: "#F5F1EC",
	label: "#8B8279",
	primary: "#F5F1EC",
	subtext: "#E0DAD3",
	subtle: "#6E665E",
	surface: "#1C1917",
};

export type Scheme = "light" | "dark";

export const paletteFor = (scheme: Scheme) =>
	scheme === "dark" ? DARK : LIGHT;

/**
 * The appearance the app draws in — the phone's, until someone says otherwise.
 *
 * An override on top of the system setting rather than a replacement for it:
 * `null` means "whatever the phone is set to", which is the only sensible way
 * to open on a first launch. A module store rather than context for the same
 * reason `useGuides` is one — the drawer content and the screens it themes are
 * siblings under the navigator, so there is no shared parent to hang a provider
 * on.
 *
 * ponytail: not persisted, so it resets with the app, exactly as Guides does in
 * the row above it. `expo-secure-store`'s synchronous `getItem` is the upgrade
 * if the choice should outlive a launch.
 */
let override: Scheme | null = null;
const listeners = new Set<() => void>();

/**
 * Shaped for the switch that calls it — a plain module function like
 * `toggleGuides`, so the drawer row can hand it over as a stable reference
 * rather than rebuilding a closure on every render.
 */
export function setDark(on: boolean) {
	override = on ? "dark" : "light";
	for (const listener of listeners) {
		listener();
	}
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const getSnapshot = () => override;

/**
 * What every surface reads to decide its palette — including the SwiftUI and
 * Compose trees, which take it as `colorScheme` and theme their own controls
 * from it. One call replaces the `useColorScheme() === "dark" ? …` this used to
 * be spelled as, in ten places.
 */
export function useScheme(): Scheme {
	const chosen = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	const system = useColorScheme();
	return chosen ?? (system === "dark" ? "dark" : "light");
}

/**
 * Liquid Glass button styles (`glass`, `glassProminent`) only exist on iOS 26.
 * Asking for one on an older system leaves the button unstyled, so fall back to
 * the closest pre-26 equivalent rather than pulling in `expo-glass-effect`
 * purely for its `isLiquidGlassAvailable()` boolean.
 */
export const supportsLiquidGlass =
	Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;
