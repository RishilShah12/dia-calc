import { selectionAsync } from "expo-haptics";
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
/**
 * Pixels per millisecond, under which a lifted finger has no momentum left to
 * run and the row under it is the row it stops on.
 */
const SETTLED_VELOCITY = 0.05;
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
	frame: { overflow: "hidden" },
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
	/** Shorter on the rough screen, which fits one more block than polish does. */
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
	// wheel out from under a finger that is still on it. True from touch-down
	// until a commit, which is the first moment the rotor is actually at rest:
	// clearing it when the finger lifts leaves the realign free to teleport a
	// list that is still decelerating.
	const live = useRef<boolean>(false);
	// Where the rotor actually sits, which cannot be derived from `selection`: a
	// scroll that lands back on the selected row changes no state at all.
	const offset = useRef<number>(0);

	// `height` is the whole box this has to fit, caption included — the Compose
	// parent sizes its slot from the same number, and anything taller than it
	// spills out of the card. Guides off drops the caption, and the rotor takes
	// that height back rather than leaving a gap where the label used to be.
	const scrollHeight = height - (label ? CAPTION_SPACE : 0);
	// Rounded: a half-pixel pad puts every snap target half a pixel off the band,
	// and the rotor never quite sits straight.
	const pad = Math.max(0, Math.round((scrollHeight - ITEM_H) / 2));
	const index = Math.max(
		0,
		options.findIndex((option) => option.value === selection)
	);
	const anchor = index * ITEM_H;

	const align = useCallback(
		(animated: boolean) => {
			ref.current?.scrollTo({ animated, y: anchor });
			offset.current = anchor;
		},
		[anchor]
	);

	useEffect(() => {
		// An external change — the grade clamp when the price list lands, or a
		// part switch on the rough screen — can move the selection while a finger
		// is still down. Scrolling then would fight the drag.
		// biome-ignore lint/suspicious/noUnnecessaryConditions: written in the scroll callbacks below, which the analyser does not follow back to this read.
		if (live.current) {
			return;
		}
		// Guard, or the scroll this triggers commits the same index straight back
		// and pins the rotor where it started.
		if (Math.abs(offset.current - anchor) < 1) {
			return;
		}
		align(false);
	}, [align, anchor]);

	const beginDrag = useCallback(() => {
		live.current = true;
	}, []);

	const trackScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			offset.current = event.nativeEvent.contentOffset.y;
		},
		[]
	);

	const commit = useCallback(
		(y: number) => {
			live.current = false;
			offset.current = y;
			// Clamped: a hard fling rounds past the end of the list.
			const next =
				options[
					Math.min(options.length - 1, Math.max(0, Math.round(y / ITEM_H)))
				];
			if (!next) {
				return;
			}
			if (next.value === selection) {
				// Landing back on the selected row changes no state, so nothing
				// re-renders, so nothing else will straighten a rotor left standing
				// between two rows.
				align(true);
				return;
			}
			selectionAsync();
			onChange(next.value);
		},
		[align, onChange, options, selection]
	);

	const settle = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			commit(event.nativeEvent.contentOffset.y);
		},
		[commit]
	);

	const endDrag = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			// A flick keeps travelling after the finger goes, so the row under it
			// now is not the row it stops on. Committing here would pick that wrong
			// row and then teleport the list mid-deceleration to reach it, which is
			// what kept the rotor from ever settling. Momentum end commits instead.
			if (Math.abs(event.nativeEvent.velocity?.y ?? 0) > SETTLED_VELOCITY) {
				return;
			}
			commit(event.nativeEvent.contentOffset.y);
		},
		[commit]
	);

	// The grades arrive with the price list, well after this has mounted and
	// scrolled against an empty list — and a `scrollTo` into rows that have not
	// laid out yet is clamped to nothing. Re-anchoring when the content is
	// measured is what puts the rotor on the grade the card is actually pricing.
	const reanchor = useCallback(() => {
		// biome-ignore lint/suspicious/noUnnecessaryConditions: written in the scroll callbacks above, which the analyser does not follow back to this read.
		if (live.current) {
			return;
		}
		align(false);
	}, [align]);

	return (
		<View style={[styles.frame, { height, width }]}>
			{label ? (
				<Text
					style={[styles.caption, { color: labelColor, height: CAPTION_SPACE }]}
				>
					{label}
				</Text>
			) : null}
			{/* Clipped: the rotor is a scroll view taller than what shows, and an
			    unclipped one paints over the card's edge. */}
			<View style={[styles.frame, { height: scrollHeight }]}>
				<View
					pointerEvents="none"
					style={[styles.band, { backgroundColor: BAND_TINT, top: pad }]}
				/>
				<ScrollView
					contentContainerStyle={{ paddingVertical: pad }}
					decelerationRate="fast"
					nestedScrollEnabled
					onContentSizeChange={reanchor}
					// A slow one-notch drag never enters momentum, so binding only
					// `onMomentumScrollEnd` silently drops that selection.
					onMomentumScrollEnd={settle}
					onScroll={trackScroll}
					onScrollBeginDrag={beginDrag}
					onScrollEndDrag={endDrag}
					ref={ref}
					scrollEventThrottle={16}
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
