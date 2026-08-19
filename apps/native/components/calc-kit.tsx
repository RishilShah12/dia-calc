import { DIGIT_ROWS } from "@dia-calc/calc/keypad";
import { hideKeypad } from "@dia-calc/calc/keypad-visible";
import {
	Button,
	Capsule,
	GlassEffectContainer,
	Grid,
	HStack,
	Image,
	Picker,
	RNHostView,
	Spacer,
	Text,
	VStack,
	ZStack,
} from "@expo/ui/swift-ui";
import {
	Animation,
	animation,
	background,
	buttonBorderShape,
	buttonStyle,
	clipped,
	contentTransition,
	controlSize,
	font,
	foregroundStyle,
	frame,
	glassEffect,
	gridCellColumns,
	monospacedDigit,
	onTapGesture,
	opacity,
	padding,
	pickerStyle,
	shapes,
	tag,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import { useCallback, useEffect, useState } from "react";

import {
	CAPTION_SPACE,
	CARD_RADIUS,
	CARET_DESCENDER,
	CARET_HEIGHT,
	CARET_WIDTH,
	DELTA_H,
	HEADER_GLYPH,
	HIDE_GLYPH,
	KEY_GAP,
	KEY_MIN_HEIGHT,
	KEY_TINT,
	KEYPAD_H,
	METRIC_VALUE,
	SUBTEXT_H,
	s,
	WHEEL_HEIGHT,
} from "@/components/calc-base";
import {
	CalcRuler,
	RULER_STRIP_H,
	RULER_TROUGH_H,
	useBackStep,
} from "@/components/calc-ruler";
import {
	ACCENT,
	type CalcPalette,
	ON_ACCENT,
	supportsLiquidGlass,
} from "@/components/calc-theme";

/**
 * The SwiftUI vocabulary both calculators are built from: the scale system, the
 * glass surfaces, and the dozen small components that make up a card.
 *
 * This exists because the polish and rough screens are the same instrument
 * pointed at different questions — same keypad, same wheels, same glass cards,
 * same header — and keeping two copies in step by hand is not a thing anyone
 * does successfully. What stays in a screen file is only what that screen
 * uniquely decides: its readout, and its fourth-column key.
 *
 * Deliberately not `.ios.tsx`: only `.ios.tsx` screens import it, so it never
 * reaches the Android graph, and a plain name is what TypeScript can resolve
 * without `moduleSuffixes`.
 */

/** SwiftUI's `.infinity` has no JSON form; this is large enough to fill. */
export const FILL = 10_000;

/**
 * The well the discount tape runs in: a recess at half the card's radius, so it
 * reads as cut into the card rather than laid on top of it.
 */
export const TROUGH_RADIUS = CARD_RADIUS / 2;

export const GLASS_CARD = glassEffect({
	cornerRadius: CARD_RADIUS,
	glass: { interactive: false, variant: "regular" },
	shape: "roundedRectangle",
});

/** Sizes are given at reference scale; every one of them shrinks with the screen. */
export const rounded = (
	size: number,
	weight: "regular" | "medium" | "semibold" | "bold" = "regular"
) => font({ design: "rounded", size: s(size), weight });

const CAPTION = rounded(12, "semibold");

export const keyStyle = buttonStyle(supportsLiquidGlass ? "glass" : "bordered");
const primaryKeyStyle = buttonStyle(
	supportsLiquidGlass ? "glassProminent" : "borderedProminent"
);

export function Caption({
	children,
	color,
}: {
	children: string;
	color: string;
}) {
	return <Text modifiers={[CAPTION, foregroundStyle(color)]}>{children}</Text>;
}

/**
 * Always renders, even with nothing to say — an empty string still occupies
 * `SUBTEXT_H`, which is what keeps a card from resizing when a subtext appears.
 */
export function Subtext({
	children,
	color,
}: {
	children: string;
	color: string;
}) {
	return (
		<Text
			modifiers={[
				rounded(15, "semibold"),
				foregroundStyle(color),
				monospacedDigit(),
				frame({ height: SUBTEXT_H }),
			]}
		>
			{children}
		</Text>
	);
}

/**
 * The percentage under a recut sum. Quieter than `Subtext` by a couple of
 * points, because it is that line's footnote and not a second one of it.
 */
export function Delta({
	children,
	color,
}: {
	children: string;
	color: string;
}) {
	return (
		<Text
			modifiers={[
				rounded(12, "semibold"),
				foregroundStyle(color),
				monospacedDigit(),
				frame({ height: DELTA_H }),
			]}
		>
			{children}
		</Text>
	);
}

/**
 * Half a second on, half a second off, forever — SwiftUI's own caret cadence.
 * `@expo/ui` has no `repeatForever`, and a count this size is 83 minutes of
 * blinking, which outlasts any session anyone spends pricing one stone.
 */
const BLINK = Animation.easeInOut({ duration: 0.5 }).repeat({
	autoreverses: true,
	repeatCount: 10_000,
});

/**
 * The bar that says which field the keypad is aimed at. The caption turning
 * orange says the same thing, but only to someone who already knows to look.
 *
 * The blink is native: one render flips `dim`, and SwiftUI repeats the fade on
 * its own. Isolated in its own component so that render is this text node and
 * nothing else — the numerals beside it are not re-sent twice a second.
 */
export function Caret({ on, size }: { on: boolean; size: number }) {
	const [dim, setDim] = useState(false);

	useEffect(() => setDim(on), [on]);

	if (!on) {
		return null;
	}
	// A drawn bar rather than a "|" glyph, which carries its own side bearings
	// and sits low in the em box. Aligned by box bottom rather than baseline:
	// the bridge wraps every stack child in its own container, so a `Text`
	// hands `firstTextBaseline` the container's edge and not the type's. The
	// bottom padding is the descender that box bottom includes and the caret
	// does not, which is what lands it on the baseline.
	return (
		<Capsule
			modifiers={[
				frame({ height: s(size * CARET_HEIGHT), width: s(CARET_WIDTH) }),
				padding({ bottom: s(size * CARET_DESCENDER) }),
				foregroundStyle(ACCENT),
				opacity(dim ? 0.1 : 1),
				animation(BLINK, dim),
			]}
		/>
	);
}

export function Metric({
	label,
	value,
	subtext,
	active = false,
	animatedOn,
	color,
	palette,
	onTap,
}: {
	active?: boolean;
	animatedOn: number;
	color: string;
	label: string;
	onTap?: () => void;
	palette: CalcPalette;
	/**
	 * An empty string still reserves `SUBTEXT_H`, which is what keeps the polish
	 * card from resizing when recut turns on. Omit the prop entirely — as the
	 * rough screen does, having nothing to say under any metric — and the row
	 * gives that height back instead.
	 */
	subtext?: string;
	value: string;
}) {
	const wrapper = onTap ? [onTapGesture(onTap)] : [];
	return (
		<VStack alignment="leading" modifiers={wrapper} spacing={2}>
			<Caption color={active ? ACCENT : palette.label}>{label}</Caption>
			{/* `active` is exactly "the keypad is pointed here", so the caret comes
			    with it and both screens get this metric's caret for free. */}
			<HStack alignment="bottom" spacing={2}>
				<Text
					modifiers={[
						rounded(METRIC_VALUE, "semibold"),
						foregroundStyle(color),
						monospacedDigit(),
						contentTransition("numericText"),
						animation(Animation.default, animatedOn),
					]}
				>
					{value}
				</Text>
				<Caret on={active} size={METRIC_VALUE} />
			</HStack>
			{subtext === undefined ? null : (
				<Subtext color={palette.subtext}>{subtext}</Subtext>
			)}
		</VStack>
	);
}

export function Wheel({
	height = WHEEL_HEIGHT,
	label,
	labelColor,
	onChange,
	options,
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
	selection: string;
	width: number;
}) {
	// Guides off drops the caption, and the wheel takes the height back rather
	// than leaving a gap where the label used to be.
	const wheelHeight = label ? height : height + CAPTION_SPACE;
	return (
		<VStack modifiers={[frame({ width })]} spacing={4}>
			{label ? <Caption color={labelColor}>{label}</Caption> : null}
			<Picker
				modifiers={[
					pickerStyle("wheel"),
					frame({ height: wheelHeight, width }),
					clipped(),
				]}
				onSelectionChange={onChange}
				selection={selection}
			>
				{options.map((option) => (
					<Text
						key={option.value}
						modifiers={[tag(option.value), rounded(18, "semibold")]}
					>
						{option.title}
					</Text>
				))}
			</Picker>
		</VStack>
	);
}

/**
 * The label carries the fill frame, not the button. A `.glass` button sizes
 * itself to its label, so framing the button leaves the glass capsule hugging
 * the glyph. Expanding the label instead makes every key fill its grid cell.
 */
export function Key({
	label,
	onPress,
	palette,
	active = false,
	wide = false,
}: {
	active?: boolean;
	label: string;
	/** Receives the label, so digit keys can share one stable handler. */
	onPress: (label: string) => void;
	palette: CalcPalette;
	/** Spans both cells the target picker used to hold. */
	wide?: boolean;
}) {
	const handlePress = useCallback(() => onPress(label), [label, onPress]);
	// A word key is sized by its label: RECUT has to fit the same column a
	// single digit sits in with room to spare.
	const glyph = label.length <= 1;
	return (
		<Button
			modifiers={[
				active ? primaryKeyStyle : keyStyle,
				tint(active ? ACCENT : KEY_TINT),
				frame({ maxHeight: FILL, maxWidth: FILL, minHeight: KEY_MIN_HEIGHT }),
				...(wide ? [gridCellColumns(2)] : []),
			]}
			onPress={handlePress}
		>
			<Text
				modifiers={[
					rounded(glyph ? 28 : 15, glyph ? "medium" : "semibold"),
					foregroundStyle(active ? ON_ACCENT : palette.keyLabel),
					frame({ maxHeight: FILL, maxWidth: FILL }),
				]}
			>
				{label}
			</Text>
		</Button>
	);
}

/**
 * The bottom row used to end in a segmented CT / $/CT / TOTAL picker saying where
 * the digits would land. It has gone: every one of those three fields is a tap
 * target on the card above and tapping one already aims the keypad, so the picker
 * was a second way to say the same thing taking half a row to say it.
 *
 * Those two cells hold the way out instead. The keypad is the largest block on
 * either screen and only wanted while a number is being typed; `hideKeypad` is a
 * module store, so nothing between here and the screen has to carry it.
 *
 * The fourth column's third slot is still `actionKey`, the one thing the two
 * calculators disagree about: polish puts RECUT there, rough puts ROUGH.
 */
export function Keypad({
	actionKey,
	onBackspace,
	onClear,
	onDigit,
	onDot,
	palette,
}: {
	/** Row three, column four. See above. */
	actionKey: React.ReactNode;
	onBackspace: () => void;
	onClear: () => void;
	onDigit: (digit: string) => void;
	onDot: () => void;
	palette: CalcPalette;
}) {
	const [top, middle, bottom] = DIGIT_ROWS;
	return (
		<GlassEffectContainer spacing={KEY_GAP}>
			{/* Height comes from `KEY_MIN_HEIGHT`, not from the leftover space: the
			    keypad sits at the bottom and the cards above take the slack. */}
			<Grid
				horizontalSpacing={KEY_GAP}
				modifiers={[frame({ height: KEYPAD_H, maxWidth: FILL })]}
				verticalSpacing={KEY_GAP}
			>
				<Grid.Row>
					{top.map((digit) => (
						<Key
							key={digit}
							label={digit}
							onPress={onDigit}
							palette={palette}
						/>
					))}
					<Key label="⌫" onPress={onBackspace} palette={palette} />
				</Grid.Row>
				<Grid.Row>
					{middle.map((digit) => (
						<Key
							key={digit}
							label={digit}
							onPress={onDigit}
							palette={palette}
						/>
					))}
					<Key label="C" onPress={onClear} palette={palette} />
				</Grid.Row>
				<Grid.Row>
					{bottom.map((digit) => (
						<Key
							key={digit}
							label={digit}
							onPress={onDigit}
							palette={palette}
						/>
					))}
					{actionKey}
				</Grid.Row>
				<Grid.Row>
					<Key label="." onPress={onDot} palette={palette} />
					<Key label="0" onPress={onDigit} palette={palette} />
					<Key label={HIDE_GLYPH} onPress={hideKeypad} palette={palette} wide />
				</Grid.Row>
			</Grid>
		</GlassEffectContainer>
	);
}

/**
 * A glass button sizes itself to its label, so the glyph's frame is what
 * decides the shape: a square one plus a circular border reads as a round
 * button, where the tall frame this replaced read as an oval.
 */
export function RoundGlassButton({
	color = KEY_TINT,
	onPress,
	symbol,
}: {
	color?: string;
	onPress: () => void;
	symbol:
		| "line.3.horizontal"
		| "list.bullet"
		| "person.crop.circle"
		| "plus"
		| "trash"
		| "xmark";
}) {
	return (
		<Button
			modifiers={[keyStyle, buttonBorderShape("circle"), tint(color)]}
			onPress={onPress}
		>
			<Image
				modifiers={[frame({ height: HEADER_GLYPH, width: HEADER_GLYPH })]}
				size={16}
				systemName={symbol}
			/>
		</Button>
	);
}

/**
 * The discount tape, recessed into the card.
 *
 * SwiftUI's `Slider` is gone from here: a back runs -100 to +100 and the trade
 * quotes it to the half, which is finer than any track this wide can resolve.
 * `CalcRuler` is the whole control — React Native, because Compose has to draw
 * the same one and the two calculators have to feel identical — and SwiftUI's
 * job is the surface under it. Glass, in its own container so the recess reads
 * against the card's glass rather than dissolving into it, and a plain tonal
 * well on anything older than iOS 26, where asking for glass draws nothing.
 *
 * No reading in the caption row: the tape's lens carries it now, at the point
 * the thumb is actually working.
 */
export function DiscountSlider({
	captionColor,
	guides,
	onChange,
	palette,
	value,
}: {
	captionColor: string;
	guides: boolean;
	onChange: (next: number) => void;
	palette: CalcPalette;
	value: number;
}) {
	const { half, step, toggleStep } = useBackStep(value, onChange);
	const trough = supportsLiquidGlass
		? glassEffect({
				cornerRadius: TROUGH_RADIUS,
				glass: { interactive: false, variant: "regular" },
				shape: "roundedRectangle",
			})
		: background(
				palette.surface,
				shapes.roundedRectangle({ cornerRadius: TROUGH_RADIUS })
			);

	return (
		<VStack modifiers={[padding({ horizontal: 18 })]} spacing={s(4)}>
			<HStack spacing={s(8)}>
				{guides ? (
					<Caption color={captionColor}>DISCOUNT OFF LIST</Caption>
				) : null}
				<Spacer />
				{/* Real glass, not a drawn pill: it sits on a glass card beside glass
				    keys, and the one control here that was painted in React Native
				    read as a sticker on top of the instrument. */}
				<Button
					modifiers={[
						half ? primaryKeyStyle : keyStyle,
						buttonBorderShape("capsule"),
						tint(half ? ACCENT : KEY_TINT),
						// Or the button's own padding makes this row taller than the
						// caption it sits in, and the card grows to carry a toggle.
						controlSize("small"),
					]}
					onPress={toggleStep}
				>
					<Text
						modifiers={[
							rounded(14, "semibold"),
							foregroundStyle(half ? ON_ACCENT : palette.keyLabel),
							frame({ width: s(18) }),
						]}
					>
						½
					</Text>
				</Button>
			</HStack>
			<GlassEffectContainer>
				{/* The recess is a layer behind the tape, not the box around it: the
				    lens spans the full block and has to stand over both edges of the
				    recess, which it cannot do from inside one. The tape holds its own
				    margins — there is no padded box left to give it any. */}
				<ZStack modifiers={[frame({ height: RULER_STRIP_H, maxWidth: FILL })]}>
					<VStack
						modifiers={[
							frame({ height: RULER_TROUGH_H, maxWidth: FILL }),
							trough,
						]}
					>
						<Spacer />
					</VStack>
					<RNHostView>
						<CalcRuler
							onChange={onChange}
							palette={palette}
							step={step}
							value={value}
						/>
					</RNHostView>
				</ZStack>
			</GlassEffectContainer>
		</VStack>
	);
}
