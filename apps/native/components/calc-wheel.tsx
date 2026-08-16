import { useCallback, useEffect, useRef } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import {
	CAPTION_SPACE,
	roundedFamily,
	s,
	WHEEL_HEIGHT,
} from "@/components/calc-base";
import { ACCENT, type CalcPalette } from "@/components/calc-theme";

/**
 * The grade rotor, for platforms that do not ship one.
 *
 * SwiftUI has `pickerStyle(.wheel)`; Material 3 has nothing equivalent, and
 * `@expo/ui`'s universal `Picker` says as much — on Android it falls back to a
 * dropdown. A dropdown is the wrong instrument here: spinning a grade under a
 * thumb is the gesture this screen is built around, and three of these sit side
 * by side. So it is hand-rolled in React Native, which both platforms can draw.
 *
 * Same props as the SwiftUI `Wheel` in `calc-kit`, so the two screens read
 * alike.
 */

/** One row. Tuned so five rows fill the same box the iOS wheel occupies. */
const ITEM_H = s(30);
const BAND_INSET = 4;
const BAND_RADIUS = s(8);
/** The selection band, at the same 12% the rap list tints a crossed cell. */
const BAND_TINT = `${ACCENT}1F`;

const styles = StyleSheet.create({
	band: {
		borderRadius: BAND_RADIUS,
		height: ITEM_H,
		left: BAND_INSET,
		position: "absolute",
		right: BAND_INSET,
	},
	caption: {
		fontFamily: roundedFamily("semibold"),
		// Scaled, and pinned to the box the layout reserves for it. A literal
		// 12pt in a box that shrinks with the screen overflows on a short device
		// and prints the caption over the first row of the rotor.
		fontSize: s(12),
		fontWeight: "600",
		letterSpacing: 0.6,
		lineHeight: CAPTION_SPACE,
		textAlign: "center",
	},
	option: {
		fontFamily: roundedFamily("semibold"),
		// Scaled for the same reason as the caption: the row it sits in is `s()`d,
		// so a literal size outgrows its row on a short screen.
		fontSize: s(18),
		fontVariant: ["tabular-nums"],
		fontWeight: "600",
		height: ITEM_H,
		lineHeight: ITEM_H,
		textAlign: "center",
	},
});

export function CalcWheel({
	height = WHEEL_HEIGHT,
	label,
	labelColor,
	onChange,
	options,
	palette,
	selection,
	width,
}: {
	height?: number;
	/** `null` with guides off — the caption is dropped, not blanked. */
	label: string | null;
	labelColor: string;
	onChange: (next: string) => void;
	options: { title: string; value: string }[];
	palette: CalcPalette;
	selection: string;
	width: number;
}) {
	const ref = useRef<ScrollView>(null);
	// A sibling re-render — a keypad tap, a price refetch — must not yank the
	// wheel out from under a finger that is still on it.
	const dragging = useRef<boolean>(false);

	// `height` is the whole box this has to fit, caption included — the Compose
	// parent sizes its slot from the same number, and anything taller than it
	// spills out of the card. Guides off drops the caption, and the rotor takes
	// that height back rather than leaving a gap where the label used to be.
	const scrollHeight = height - (label ? CAPTION_SPACE : 0);
	const pad = Math.max(0, (scrollHeight - ITEM_H) / 2);
	const index = Math.max(
		0,
		options.findIndex((option) => option.value === selection)
	);

	useEffect(() => {
		// An external change — the grade clamp when the price list lands, or a
		// part switch on the rough screen — can move the selection while a finger
		// is still down. Scrolling then would fight the drag.
		// biome-ignore lint/suspicious/noUnnecessaryConditions: written in the scroll callbacks below, which the analyser does not follow back to this read.
		if (dragging.current) {
			return;
		}
		ref.current?.scrollTo({ animated: false, y: index * ITEM_H });
	}, [index]);

	const beginDrag = useCallback(() => {
		dragging.current = true;
	}, []);

	const commit = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			dragging.current = false;
			const next =
				options[Math.round(event.nativeEvent.contentOffset.y / ITEM_H)];
			if (next && next.value !== selection) {
				onChange(next.value);
			}
		},
		[onChange, options, selection]
	);

	return (
		<View style={{ height, overflow: "hidden", width }}>
			{label ? (
				<Text
					style={[styles.caption, { color: labelColor, height: CAPTION_SPACE }]}
				>
					{label}
				</Text>
			) : null}
			{/* Clipped: the rotor is a scroll view taller than what shows, and an
			    unclipped one paints over the card's edge. */}
			<View style={{ height: scrollHeight, overflow: "hidden" }}>
				<View
					pointerEvents="none"
					style={[styles.band, { backgroundColor: BAND_TINT, top: pad }]}
				/>
				<ScrollView
					contentContainerStyle={{ paddingVertical: pad }}
					decelerationRate="fast"
					nestedScrollEnabled
					// A slow one-notch drag never enters momentum, so binding only
					// `onMomentumScrollEnd` silently drops that selection.
					onMomentumScrollEnd={commit}
					onScrollBeginDrag={beginDrag}
					onScrollEndDrag={commit}
					ref={ref}
					showsVerticalScrollIndicator={false}
					snapToInterval={ITEM_H}
				>
					{options.map((option) => (
						<Text
							key={option.value}
							style={[
								styles.option,
								{
									color: option.value === selection ? ACCENT : palette.primary,
								},
							]}
						>
							{option.title}
						</Text>
					))}
				</ScrollView>
			</View>
		</View>
	);
}
