import { Platform } from "react-native";

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
	/** Ink on a glass key. Must follow the appearance or it vanishes. */
	keyLabel: string;
	/** Small uppercase captions: CARAT, RAP LIST, DISCOUNT OFF LIST. */
	label: string;
	/** Body/primary numerals. */
	primary: string;
	/** "was $5,400" under a recut value — quieter than `label`. */
	subtle: string;
}

const LIGHT: CalcPalette = {
	background: "#F6EEE6",
	keyLabel: "#1C1917",
	label: "#8C8378",
	primary: "#1C1917",
	subtle: "#A79C90",
};

const DARK: CalcPalette = {
	background: "#0C0A09",
	keyLabel: "#F5F1EC",
	label: "#8B8279",
	primary: "#F5F1EC",
	subtle: "#6E665E",
};

export type Scheme = "light" | "dark";

export const paletteFor = (scheme: Scheme) =>
	scheme === "dark" ? DARK : LIGHT;

/**
 * Liquid Glass button styles (`glass`, `glassProminent`) only exist on iOS 26.
 * Asking for one on an older system leaves the button unstyled, so fall back to
 * the closest pre-26 equivalent rather than pulling in `expo-glass-effect`
 * purely for its `isLiquidGlassAvailable()` boolean.
 */
export const supportsLiquidGlass =
	Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;
