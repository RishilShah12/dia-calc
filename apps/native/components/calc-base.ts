import { Dimensions, Platform } from "react-native";

/**
 * The platform-neutral half of the calculator's design vocabulary: the scale
 * system, the measurements every card is cut to, and the two colours that are
 * not in `calc-theme`'s appearance-following palette.
 *
 * Split out of `calc-kit` so the Android tree can share the geometry without
 * pulling the SwiftUI components — and the numbers — into its bundle graph.
 * `calc-kit` (SwiftUI) and `calc-kit-compose` (Jetpack Compose) both build on
 * this, which is what keeps the two platforms cut to the same proportions.
 *
 * Nothing here may import from either kit, or the split has bought nothing.
 */

/**
 * Every size below is authored for a 6.3" iPhone and multiplied by `SCALE`, so
 * the whole layout keeps its proportions down to an SE instead of overflowing.
 * Read once at module load: the app is portrait-locked, so this never changes.
 *
 * ponytail: calibrated against iPhone heights; Android aspect ratios run
 * taller, so retune `REFERENCE_HEIGHT` if the keypad crowds on real hardware.
 */
const REFERENCE_HEIGHT = 874;
/**
 * Chrome that never scales: status bar, navigation bar, the stack's header and
 * the gesture inset. Scaling against the raw window height quietly assumes that
 * chrome shrinks too — it doesn't, so it eats a far larger share of a short
 * screen and the layout under-compresses exactly where room is tightest. What
 * the cards actually compete for is the height left after chrome, so that is
 * what the ratio is taken over.
 *
 * Chosen so a ~900dp phone still lands at 1.0 and renders unchanged.
 */
const CHROME = 150;
const SCALE = Math.min(
	1,
	(Dimensions.get("window").height - CHROME) / (REFERENCE_HEIGHT - CHROME)
);
export const s = (size: number) => Math.round(size * SCALE);

export const SCREEN_PADDING = 16;
export const BLOCK_GAP = s(8);

/** Square, so a circular glass button wraps a square glyph rather than an oval. */
export const HEADER_GLYPH = s(22);
export const WHEEL_HEIGHT = s(110);
/**
 * A caption line plus the wheel's own 4pt spacing. Handed back to the picker
 * when guides are off, so dropping the label buys wheel height rather than
 * leaving a hole where the label used to be.
 */
export const CAPTION_SPACE = s(19);
/** What a key row actually measures: the keypad never takes spare height. */
export const KEY_MIN_HEIGHT = s(52);
export const KEY_GAP = s(10);
/**
 * Four key rows and the three gaps between them, reserved rather than left to
 * the layout to negotiate. The cards above are greedy, and on a screen with
 * more blocks than slack they win that negotiation and squeeze the bottom row
 * of keys off the screen — which is exactly what the rough screen does.
 */
export const KEYPAD_H = KEY_MIN_HEIGHT * 4 + KEY_GAP * 3;
/**
 * Reserved whether or not a subtext is showing. Sized to be read rather than
 * merely noticed: in recut mode the "was …" lines are the whole point of the
 * comparison, and against numerals three times their size they lose.
 *
 * Moves with `Subtext`'s font — a 15pt rounded face needs ~18pt of line, and a
 * fixed frame shorter than its content clips rather than grows.
 */
export const SUBTEXT_H = s(20);
export const CARD_PADDING = s(18);
/** Named because the caret beside it has to be cut to the same size. */
export const METRIC_VALUE = 20;
/**
 * The caret, as a share of the numeral it marks. Roughly the cap height of SF
 * Rounded, so the bar stands exactly as tall as the digits beside it.
 */
export const CARET_HEIGHT = 0.72;
export const CARET_WIDTH = 3;
/** SF's descender, which the text's box includes and a bare capsule does not. */
export const CARET_DESCENDER = 0.21;

/**
 * Every card in the app, and the rap list's table, so the whole set reads as
 * one family. On iOS this is the glass radius; on Android the Material card's.
 */
export const CARD_RADIUS = 28;

/** Keys read as a dark slab in both appearances, as in the design. */
export const KEY_TINT = "#3A3735";
/**
 * Ink on a key, and deliberately not `palette.keyLabel`.
 *
 * The slab above is fixed in both appearances, so the ink has to be too. On
 * iOS this is moot — there `KEY_TINT` tints a *translucent* glass button, so
 * the surface stays light and the appearance-following label reads fine. A
 * Compose button fills solid, where the light palette's near-black label on
 * this slab lands at about 1.5:1 and is effectively unreadable.
 */
export const KEY_LABEL = "#F5F1EC";
/** Sign out, delete a part, a failed price list. */
export const DESTRUCTIVE = "#D9544D";

export type RoundedWeight = "regular" | "medium" | "semibold" | "bold";

/**
 * The app is set in one rounded face at every size. iOS has one in the system —
 * SwiftUI asks for it by design, and React Native by the private family name
 * below — but Android has nothing equivalent, so it bundles Nunito.
 *
 * iOS picks the weight off a single family; Android registers one family per
 * file, so the weight has to be part of the name. `fontWeight` is still worth
 * setting alongside this: it is what iOS acts on, and what Android falls back
 * to if a face ever fails to load.
 */
const ANDROID_ROUNDED: Record<RoundedWeight, string> = {
	bold: "Nunito_700Bold",
	medium: "Nunito_500Medium",
	regular: "Nunito_400Regular",
	semibold: "Nunito_600SemiBold",
};

export const roundedFamily = (weight: RoundedWeight = "regular") =>
	Platform.OS === "ios" ? ".AppleSystemUIFontRounded" : ANDROID_ROUNDED[weight];
