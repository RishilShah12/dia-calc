import {
	type BackStep,
	MAX_BACK,
	MIN_BACK,
	snapBack,
} from "@dia-calc/calc/rap-calc";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
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
 * The discount tape: percentages that scroll under a fixed caret.
 *
 * A slider cannot do this job. The back runs -100 to +100 and the trade quotes
 * it to the half, so a phone-wide track is about two percent per pixel — a
 * dealer can point at a number but never land on it. A tape moves the scale
 * instead of the thumb, so the precision is in how far you scroll rather than
 * how wide the screen is, and the numbers along it say where you are.
 *
 * React Native rather than either kit, because neither SwiftUI nor Material has
 * this control and the two calculators have to feel identical. Only the tape
 * lives here: the caption, the reading and the ½ button are native in each kit,
 * where a button can be real glass instead of an RN imitation of one.
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
/** What the kits reserve for the tape. */
export const RULER_STRIP_H = LABEL_TOP + LABEL_LINE;
const CARET_W = s(3);
/** Stands past the long ticks, so the reading point is never in doubt. */
const CARET_H = MAJOR_H + s(6);
export const HALF: BackStep = 0.5;
/**
 * Pixels per millisecond, under which a lifted finger has no momentum left to
 * run and the tick under the caret is the one it stops on.
 */
const SETTLED_VELOCITY = 0.05;
/** List price, the landmark the whole tape is read against. */
const ZERO_TINT = `${ACCENT}CC`;

const tickHeight = (value: number) => {
	if (value % MAJOR_EVERY === 0) {
		return MAJOR_H;
	}
	return Number.isInteger(value) ? MINOR_H : HALF_H;
};

const styles = StyleSheet.create({
	caret: {
		backgroundColor: ACCENT,
		borderRadius: CARET_W,
		height: CARET_H,
		width: CARET_W,
	},
	caretLane: { alignItems: "center" },
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
	strip: { height: RULER_STRIP_H },
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
 * and the only thing that changes it is the step: the caret and the reading
 * re-render on every scroll frame, and re-creating four hundred ticks under
 * them would make the drag stutter on exactly the phones this ships to.
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
	// Where the tape actually sits. Not derivable from `value`, which is a
	// percentage and says nothing about a scroll that landed between ticks.
	const offset = useRef<number>(0);
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
		// Guard, or the scroll this triggers reports back the offset it just set.
		if (Math.abs(offset.current - anchor) < 1) {
			return;
		}
		align(false);
	}, [align, anchor]);

	const emit = useCallback(
		(x: number) => {
			const index = Math.min(last, Math.max(0, Math.round(x / pitch)));
			const next = snapBack(MIN_BACK + index * step, step);
			if (next !== value) {
				// A tick the thumb can feel. Selection feedback is the picker's
				// gesture; a ruler passing a graduation is an impact.
				impactAsync(ImpactFeedbackStyle.Light);
				onChange(next);
			}
			return index;
		},
		[last, onChange, pitch, step, value]
	);

	const beginDrag = useCallback(() => {
		live.current = true;
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
				emit(x);
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
			const index = emit(event.nativeEvent.contentOffset.x);
			// Landing on the tick already selected changes no state, so nothing
			// re-renders, so nothing else would straighten a tape left between two.
			offset.current = index * pitch;
			ref.current?.scrollTo({ animated: true, x: index * pitch });
		},
		[emit, pitch]
	);

	const endDrag = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			// A flick keeps travelling after the finger goes; snapping the tape to
			// the tick under it now would fight the deceleration. Momentum end
			// settles that one.
			if (Math.abs(event.nativeEvent.velocity?.x ?? 0) > SETTLED_VELOCITY) {
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
					paddingHorizontal: Math.max(0, (stripWidth - TICK_W) / 2),
				}}
				decelerationRate="fast"
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
			>
				<Ticks palette={palette} step={step} />
			</ScrollView>
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFill, styles.caretLane]}
			>
				<View style={styles.caret} />
			</View>
		</View>
	);
}
