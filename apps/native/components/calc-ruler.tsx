import {
	type BackStep,
	formatBack,
	MAX_BACK,
	MIN_BACK,
	snapBack,
} from "@dia-calc/calc/rap-calc";
import {
	GlassView,
	isGlassEffectAPIAvailable,
	isLiquidGlassAvailable,
} from "expo-glass-effect";
import { selectionAsync } from "expo-haptics";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { roundedFamily, s } from "@/components/calc-base";
import { ACCENT, type CalcPalette } from "@/components/calc-theme";

/**
 * The discount tape: percentages that scroll under a fixed lens.
 *
 * A slider cannot do this job. The back runs -100 to +100 and the trade quotes
 * it to the half, so a phone-wide track is about two percent per pixel — a
 * dealer can point at a number but never land on it. A tape moves the scale
 * instead of the thumb, so the precision is in how far you scroll rather than
 * how wide the screen is, and the numbers along it say where you are.
 *
 * React Native rather than either kit, because neither SwiftUI nor Material has
 * this control and the two calculators have to feel identical. The tape and the
 * lens that reads it live here; the caption and the ½ button stay native in each
 * kit, where a button can be real glass instead of an RN imitation of one.
 */

/**
 * How far apart two whole percents sit, whatever the step is.
 *
 * Fixed rather than per-step on purpose: turning ½ on adds a tick between each
 * pair, it does not respace the scale. Every number stays exactly where the
 * thumb left it, and the only thing that changes is that there is now something
 * to stop on between them.
 */
const TICK_W = s(2);
const WHOLE_PITCH = s(20);
const pitchFor = (step: BackStep) => WHOLE_PITCH * step;
/** A half, a whole, and every fifth — three heights, so the scale reads at a glance. */
const HALF_H = s(6);
const MINOR_H = s(11);
const MAJOR_H = s(18);
const MAJOR_EVERY = 5;
/** Numbered every other percent: every one of them is a wall of digits. */
const LABEL_EVERY = 2;

const LABEL_TOP = MAJOR_H + s(4);
const LABEL_W = s(48);
const LABEL_LINE = s(14);
/**
 * Air above the ticks and below their numbers.
 *
 * This is the trough's inset, moved inside the tape. It used to be padding on
 * the kits' recess, which meant the hosted tape only ever received the box
 * between the pads — and a lens as tall as that box floated with ten points of
 * dead trough above and below it, reading as a chip parked on the scale rather
 * than a window standing on it. Held here instead, the tape is handed the whole
 * recess, the lens spans it edge to edge, and the trough is the same height it
 * always was.
 */
const TAPE_PAD_V = s(10);
/**
 * The tape's own margin from the ends of the recess, held here for the same
 * reason as the vertical one: the kits no longer own a box to pad.
 */
const TAPE_PAD_H = s(14);
/**
 * How far the lens stands proud of the recess, top and bottom.
 *
 * A cursor on a tape measure is taller than the tape — it is a thing that grips
 * the scale rather than a thing printed on it, and the overhang is what says
 * so. The recess gives up the height rather than the block growing: the rough
 * screen has none to spare.
 */
const LENS_OVERHANG = s(4);
/**
 * The lens: a glass window standing on the tape, the reading inside it.
 *
 * A tape has no thumb, so what marked the reading point was a hairline caret
 * and a number in the caption row an inch away — the dealer read the answer
 * somewhere other than where the gesture was. The lens is both at once: it is
 * the mark, so the caret went, and it is the readout, so the caption row's copy
 * went with it in each kit.
 *
 * Real Liquid Glass where the system has it. The pane is the one thing on this
 * screen that must sample what is behind it — the ticks and their numbers run
 * under the lens and have to show through — and painting a translucent fill
 * only ever approximated that. `GlassView` is a plain React Native view, which
 * is what makes it usable here at all: the tape is hosted inside each kit, and
 * a SwiftUI lens laid over the host would have swallowed the drag.
 *
 * The reading is drawn by React Native on top of the pane, not inside it, so
 * the glass never re-renders while a flick counts ticks past it.
 */
const LENS_W = s(80);
const LENS_RADIUS = s(12);
/**
 * What the kits reserve for the tape: the whole recess, pads included. Both
 * troughs size themselves from this, so it is the trough's height and not just
 * the tape lane's.
 */
export const RULER_STRIP_H = TAPE_PAD_V * 2 + LABEL_TOP + LABEL_LINE;
/**
 * The recess the kits paint behind the tape — shorter than the box, so the lens
 * that spans the box stands over both its edges. A layer, not a container:
 * Compose has no shaped background, so a rounded trough there has to `clip`,
 * and anything hosted inside one is cut off at its edge.
 */
export const RULER_TROUGH_H = RULER_STRIP_H - LENS_OVERHANG * 2;
export const HALF: BackStep = 0.5;
/**
 * Pixels per millisecond, under which a lifted finger has no momentum left to
 * run and the tick under the lens is the one it stops on.
 */
const SETTLED_VELOCITY = 0.05;
/**
 * The shortest gap between two detents.
 *
 * The taptic engine plays about twenty-five selection ticks a second. A flick
 * across a twenty-point pitch asks for a hundred, and the ones it cannot play
 * queue: the tape ends up buzzing a beat behind a scroll that has already
 * stopped. The wheel never does this because it commits once, at rest. Thinning
 * the detents to what the engine can actually play — and with them the renders
 * they carry — is what makes a flung tape read like a spun rotor.
 */
const DETENT_MS = 40;
/** List price, the landmark the whole tape is read against. */
const ZERO_TINT = `${ACCENT}CC`;
/**
 * The painted pane, for Android and for iOS before 26 — everywhere the system
 * has no glass to lend.
 *
 * Opaque, and the fill is the trough's own surface. Translucent was tried and
 * it ghosted: the tonal trough is painted in that same surface, so a fill at
 * ninety percent of it is the trough again with the two labels under the lens
 * showing faintly through — the exact smudge the lens was built to end. What
 * separates it here is the rim, not the fill.
 */
/**
 * The rim reads at half strength on cream; a `tintColor` on the glass was tried
 * beside it and dropped, because washing the pane orange buried the very ticks
 * the lens is meant to show.
 */
const LENS_EDGE = `${ACCENT}80`;
/**
 * Both, because they answer different questions: whether the system has the API
 * at all, and whether this build is allowed to draw with it. Read once — neither
 * can change while the app is running.
 */
const GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const tickHeight = (value: number) => {
	if (value % MAJOR_EVERY === 0) {
		return MAJOR_H;
	}
	return Number.isInteger(value) ? MINOR_H : HALF_H;
};

const styles = StyleSheet.create({
	label: {
		fontFamily: roundedFamily("semibold"),
		fontSize: s(11),
		fontVariant: ["tabular-nums"],
		fontWeight: "600",
		left: (TICK_W - LABEL_W) / 2,
		lineHeight: LABEL_LINE,
		position: "absolute",
		textAlign: "center",
		top: LABEL_TOP,
		width: LABEL_W,
	},
	lens: {
		alignItems: "center",
		height: RULER_STRIP_H,
		justifyContent: "center",
		width: LENS_W,
	},
	lensLane: { alignItems: "center" },
	lensText: {
		color: ACCENT,
		fontFamily: roundedFamily("bold"),
		fontSize: s(16),
		fontVariant: ["tabular-nums"],
		fontWeight: "700",
	},
	pane: { borderRadius: LENS_RADIUS },
	// A lift needs something opaque to cast from, which the glass path has not
	// got — so it belongs to the painted pane rather than to the shared rim.
	paneFallback: {
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { height: 1, width: 0 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
	},
	rim: { borderColor: LENS_EDGE, borderWidth: 1 },
	strip: { height: RULER_STRIP_H, paddingHorizontal: TAPE_PAD_H },
	// Fills the recess rather than sizing to the ticks, or the label lane along
	// the bottom of the trough is not a place a thumb can grab the tape.
	tape: { flex: 1 },
	// The number under a numbered tick is twenty times wider than the tick it
	// belongs to, so it hangs out of both sides of its parent. Spelled out
	// because a rounded background is exactly the case where Android is tempted
	// to clip its children.
	tick: { borderRadius: TICK_W, overflow: "visible" },
});

const tickValues = (step: BackStep) => {
	const count = Math.round((MAX_BACK - MIN_BACK) / step) + 1;
	return Array.from({ length: count }, (_, i) =>
		snapBack(MIN_BACK + i * step, step)
	);
};

/**
 * The step is a view concern — nothing downstream of the calculator cares how
 * finely the dealer dialled a back in — but both kits need it in the same shape,
 * so it lives with the tape it drives rather than in each of them.
 */
export function useBackStep(value: number, onChange: (next: number) => void) {
	const [step, setStep] = useState<BackStep>(1);
	const half = step === HALF;

	const toggleStep = useCallback(() => {
		const next: BackStep = half ? 1 : HALF;
		setStep(next);
		// Coming back to whole percents with a half selected would leave the
		// reading a half step off every tick on the tape.
		const snapped = snapBack(value, next);
		if (snapped !== value) {
			onChange(snapped);
		}
	}, [half, onChange, value]);

	return { half, step, toggleStep };
}

/**
 * Split out and memoised because the tape is the expensive half of this screen
 * and the only thing that changes it is the step: the lens re-renders on every
 * scroll frame, and re-creating four hundred ticks under it would make the drag
 * stutter on exactly the phones this ships to.
 *
 * ponytail: every tick is a real view — ~400 of them in half mode, mounted once
 * per toggle. Recycling (`@legendapp/list`) is the upgrade if a low-end Android
 * ever stutters on the toggle itself.
 */
const Ticks = memo(
	({ palette, step }: { palette: CalcPalette; step: BackStep }) => {
		const values = useMemo(() => tickValues(step), [step]);
		const gap = pitchFor(step) - TICK_W;

		return (
			<>
				{values.map((value) => {
					const ink =
						value % MAJOR_EVERY === 0 ? palette.subtle : palette.hairline;
					return (
						<View
							key={value}
							style={[
								styles.tick,
								{
									backgroundColor: value === 0 ? ZERO_TINT : ink,
									height: tickHeight(value),
									marginRight: gap,
									width: TICK_W,
								},
							]}
						>
							{/* Every other percent carries its number: one on each tick is a
							    wall of digits, and one every five is a scale you have to
							    count along. The ones between are read off their neighbour. */}
							{value % LABEL_EVERY === 0 ? (
								<Text style={[styles.label, { color: palette.label }]}>
									{value > 0 ? `+${value}` : `${value}`}
								</Text>
							) : null}
						</View>
					);
				})}
			</>
		);
	}
);

export function CalcRuler({
	onChange,
	palette,
	step,
	value,
}: {
	onChange: (next: number) => void;
	palette: CalcPalette;
	step: BackStep;
	value: number;
}) {
	const ref = useRef<ScrollView>(null);
	// True from touch-down until the tape is at rest. Everything the tape emits
	// is gated on it: a programmatic scroll fires the same events a finger does,
	// and one that re-emits its own landing spot would round a typed price's
	// back to the nearest tick behind the dealer's back.
	const live = useRef<boolean>(false);
	// True only while the finger is down. `live` covers the flick after it too,
	// and the two want different things: what the card is told, and what the
	// lens is told.
	const drag = useRef<boolean>(false);
	// Where the tape actually sits. Not derivable from `value`, which is a
	// percentage and says nothing about a scroll that landed between ticks.
	const offset = useRef<number>(0);
	// The tick last passed. A ref, not `reading`: several scroll events land
	// between two renders, and a tick counted off stale state re-fires its
	// detent every frame until React catches up.
	const mark = useRef<number>(-1);
	// What the lens says. Its own state because the lens has to keep up with a
	// flick that the card deliberately does not hear.
	const [reading, setReading] = useState(value);
	// When the last detent played. Not state: it is read and written inside a
	// scroll callback that must not re-render to do its job.
	const beat = useRef<number>(0);
	const [stripWidth, setStripWidth] = useState(0);

	const pitch = pitchFor(step);
	const last = Math.round((MAX_BACK - MIN_BACK) / step);
	const anchor =
		Math.min(last, Math.max(0, Math.round((value - MIN_BACK) / step))) * pitch;

	const align = useCallback(
		(animated: boolean) => {
			ref.current?.scrollTo({ animated, x: anchor });
			offset.current = anchor;
		},
		[anchor]
	);

	useEffect(() => {
		// biome-ignore lint/suspicious/noUnnecessaryConditions: the scroll callbacks write this ref, which the analyser does not follow back to these reads.
		if (live.current) {
			return;
		}
		// A typed price moves the back without touching the tape, and the lens
		// reads off the tape. Both come back into line here.
		setReading(value);
		mark.current = Math.round(anchor / pitch);
		// Guard, or the scroll this triggers reports back the offset it just set.
		if (Math.abs(offset.current - anchor) < 1) {
			return;
		}
		align(false);
	}, [align, anchor, pitch, value]);

	const emit = useCallback(
		(x: number, commit: boolean) => {
			const index = Math.min(last, Math.max(0, Math.round(x / pitch)));
			const next = snapBack(MIN_BACK + index * step, step);
			if (index !== mark.current) {
				mark.current = index;
				const now = Date.now();
				if (now - beat.current >= DETENT_MS) {
					beat.current = now;
					// The wheel's detent, not a knock: one generator told the selection
					// moved, which is the picker's own gesture.
					selectionAsync();
					setReading(next);
					// Each of these re-renders a whole SwiftUI or Compose card. Worth
					// it under a finger, where the total is what the dealer is dragging
					// against — but a flick crosses ticks faster than anyone reads one,
					// so momentum moves the lens alone.
					// biome-ignore lint/suspicious/noUnnecessaryConditions: the scroll callbacks write this ref, which the analyser does not follow back to this read.
					if (drag.current) {
						onChange(next);
					}
				}
			}
			// Always, however thin the detents were: this is where the tape came to
			// rest, and it is the reading the card is priced from.
			if (commit) {
				setReading(next);
				if (next !== value) {
					onChange(next);
				}
			}
			return index;
		},
		[last, onChange, pitch, step, value]
	);

	const beginDrag = useCallback(() => {
		live.current = true;
		drag.current = true;
	}, []);

	const trackScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { x } = event.nativeEvent.contentOffset;
			offset.current = x;
			// Live, not on release: the total and the price per carat are what the
			// dealer is watching while the tape moves, and a number that only
			// arrives when the finger lifts is a number arrived at blind.
			// biome-ignore lint/suspicious/noUnnecessaryConditions: the scroll callbacks write this ref, which the analyser does not follow back to these reads.
			if (live.current) {
				emit(x, false);
			}
		},
		[emit]
	);

	const settle = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			// biome-ignore lint/suspicious/noUnnecessaryConditions: the scroll callbacks write this ref, which the analyser does not follow back to these reads.
			if (!live.current) {
				return;
			}
			live.current = false;
			drag.current = false;
			const index = emit(event.nativeEvent.contentOffset.x, true);
			// Landing on the tick already selected changes no state, so nothing
			// re-renders, so nothing else would straighten a tape left between two.
			offset.current = index * pitch;
			// Only if it is actually crooked: `snapToInterval` has usually already
			// parked it, and animating to where it stands puts a visible hitch at
			// the end of every flick.
			if (Math.abs(event.nativeEvent.contentOffset.x - index * pitch) >= 1) {
				ref.current?.scrollTo({ animated: true, x: index * pitch });
			}
		},
		[emit, pitch]
	);

	const endDrag = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			// A flick keeps travelling after the finger goes; snapping the tape to
			// the tick under it now would fight the deceleration. Momentum end
			// settles that one.
			if (Math.abs(event.nativeEvent.velocity?.x ?? 0) > SETTLED_VELOCITY) {
				// The finger is off, so the card stops hearing every tick from here.
				drag.current = false;
				return;
			}
			settle(event);
		},
		[settle]
	);

	// The tape is built from the step, so the toggle changes its whole length —
	// and the first layout happens before the width is known at all. Both land
	// here rather than in an effect that would have to guess when they happened.
	const reanchor = useCallback(() => {
		// biome-ignore lint/suspicious/noUnnecessaryConditions: the scroll callbacks write this ref, which the analyser does not follow back to these reads.
		if (live.current) {
			return;
		}
		align(false);
	}, [align]);

	const measure = useCallback((event: LayoutChangeEvent) => {
		setStripWidth(event.nativeEvent.layout.width);
	}, []);

	return (
		<View onLayout={measure} style={styles.strip}>
			<ScrollView
				contentContainerStyle={{
					// The strip carries the tape's margins, so the width to centre a
					// tick in is what is left inside them.
					paddingHorizontal: Math.max(
						0,
						(stripWidth - TAPE_PAD_H * 2 - TICK_W) / 2
					),
					// The ticks hang from the top of the lane and their numbers are
					// positioned off each tick, so one pad drops the whole scale into
					// the middle of the recess.
					paddingTop: TAPE_PAD_V,
				}}
				decelerationRate="normal"
				horizontal
				nestedScrollEnabled
				onContentSizeChange={reanchor}
				onMomentumScrollEnd={settle}
				onScroll={trackScroll}
				onScrollBeginDrag={beginDrag}
				onScrollEndDrag={endDrag}
				ref={ref}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
				snapToInterval={pitch}
				style={styles.tape}
			>
				<Ticks palette={palette} step={step} />
			</ScrollView>
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFill, styles.lensLane]}
			>
				<View style={styles.lens}>
					{GLASS ? (
						<GlassView
							glassEffectStyle="clear"
							style={[StyleSheet.absoluteFill, styles.pane]}
						/>
					) : (
						<View
							style={[
								StyleSheet.absoluteFill,
								styles.pane,
								styles.paneFallback,
								{ backgroundColor: palette.surface },
							]}
						/>
					)}
					{/* The rim, drawn here rather than left to the pane: `GlassView` does
					    not take React Native's border, and the glass's own edge is a
					    specular highlight that needs a bright backdrop to show — on cream
					    it disappears, and a cursor with no edge is a smudge. */}
					<View style={[StyleSheet.absoluteFill, styles.pane, styles.rim]} />
					{/* Drawn over the pane, not inside it: the reading changes on every
					    tick a flick crosses, and the glass has nothing to say about it. */}
					{/* `numberOfLines` but not `adjustsFontSizeToFit`: the lens is cut
					    to hold the widest reading already, and re-measuring the text to
					    fit on every tick a flick crosses is the most expensive thing
					    that could sit on the scroll path. */}
					<Text numberOfLines={1} style={styles.lensText}>
						{formatBack(reading, step)}
					</Text>
				</View>
			</View>
		</View>
	);
}
