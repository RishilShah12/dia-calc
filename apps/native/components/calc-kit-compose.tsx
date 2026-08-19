import { DIGIT_ROWS } from "@dia-calc/calc/keypad";
import { hideKeypad } from "@dia-calc/calc/keypad-visible";
import {
	Box,
	Button,
	Card,
	Column,
	Icon,
	RNHostView,
	Row,
	SegmentedButton,
	SingleChoiceSegmentedButtonRow,
	Spacer,
	Text,
} from "@expo/ui/jetpack-compose";
import {
	background,
	clickable,
	clip,
	fillMaxHeight,
	fillMaxWidth,
	height as heightOf,
	padding,
	Shapes,
	size,
	weight,
	width as widthOf,
	wrapContentHeight,
} from "@expo/ui/jetpack-compose/modifiers";
import { unstable_getMaterialSymbolSourceAsync } from "expo-symbols";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import {
	CARD_RADIUS,
	CARET_DESCENDER,
	CARET_HEIGHT,
	CARET_WIDTH,
	DELTA_H,
	HIDE_GLYPH,
	KEY_GAP,
	KEY_LABEL,
	KEY_TINT,
	KEYPAD_H,
	METRIC_VALUE,
	type RoundedWeight,
	roundedFamily,
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
import { ACCENT, type CalcPalette, ON_ACCENT } from "@/components/calc-theme";
import { CalcWheel } from "@/components/calc-wheel";

/**
 * The Jetpack Compose vocabulary the Android screens are built from — the
 * counterpart to `calc-kit`'s SwiftUI one, cut to the same measurements out of
 * `calc-base` so the two platforms keep the same proportions.
 *
 * Named rather than suffixed `.android.tsx` on purpose: `calc-kit` documents
 * that it avoids a platform suffix so TypeScript can resolve it, and giving
 * these two the same name would make which kit you get depend on the bundler
 * rather than on the import you wrote.
 *
 * The design language survives the port; the material does not. There is no
 * Liquid Glass on Android, so a card is a Material 3 surface at the same radius
 * in the same cream. What is genuinely gone is noted where it happens.
 */

/** Compose picks a face by family name, so the weight is part of the name. */
export const rounded = (size_: number, weight_: RoundedWeight = "regular") => ({
	fontFamily: roundedFamily(weight_),
	fontSize: s(size_),
	fontWeight: WEIGHT_VALUE[weight_],
});

const WEIGHT_VALUE = {
	bold: "700",
	medium: "500",
	regular: "400",
	semibold: "600",
} as const;

const KEY_RADIUS = s(18);
const ICON_BUTTON = s(40);
/**
 * The well the discount tape runs in. Half the card's radius and a tonal fill,
 * which is Material's way of saying what Liquid Glass says with a recess: this
 * strip is inset into the card rather than printed on it.
 */
const TROUGH_RADIUS = CARD_RADIUS / 2;

/**
 * The glass card's stand-in.
 *
 * Elevation only in light. Material tints an elevated surface *lighter* the
 * higher it sits, which in dark mode fights the fixed `#1C1917` this palette
 * names — so dark gets a hairline instead, and the card keeps its colour.
 */
export function CalcCard({
	children,
	grow = true,
	pad = 0,
	padH = pad,
	padV = pad,
	palette,
	scheme,
	spacing = s(8),
}: {
	children: ReactNode;
	grow?: boolean;
	/** Uniform inset; override one axis with `padH`/`padV` as the cards do. */
	pad?: number;
	padH?: number;
	padV?: number;
	palette: CalcPalette;
	scheme: "light" | "dark";
	spacing?: number;
}) {
	const dark = scheme === "dark";
	return (
		<Card
			border={dark ? { color: palette.hairline, width: 1 } : undefined}
			colors={{
				containerColor: palette.surface,
				contentColor: palette.primary,
			}}
			elevation={dark ? 0 : 1}
			modifiers={[
				clip(Shapes.RoundedCorner(CARD_RADIUS)),
				fillMaxWidth(),
				...(grow ? [weight(1)] : []),
			]}
		>
			<Column
				modifiers={[
					padding(padH, padV, padH, padV),
					fillMaxWidth(),
					// A growing card is taller than its content, and a Compose
					// `Column` leaves that slack at the bottom where SwiftUI's
					// `frame(maxHeight:)` would centre it. Fill the height, then
					// wrap it again and centre what wrapped — there is no combined
					// spaced-and-centred arrangement to ask for instead.
					...(grow
						? [fillMaxHeight(), wrapContentHeight("centerVertically")]
						: []),
				]}
				verticalArrangement={{ spacedBy: spacing }}
			>
				{children}
			</Column>
		</Card>
	);
}

/**
 * Material Symbols ship as a font, so a glyph has to be rasterised before
 * Compose's `Icon` — which wants an image source — can draw it. That is async,
 * so the first frame has nothing to show; callers render the icon only once it
 * arrives rather than reserving a gap for it.
 */
export function useMaterialSymbol(
	name: MaterialSymbolName,
	color: string,
	glyph = 22
) {
	const [source, setSource] = useState<ImageSourcePropType>();
	useEffect(() => {
		let cancelled = false;
		unstable_getMaterialSymbolSourceAsync(name, glyph, color).then((next) => {
			if (!cancelled && next) {
				setSource(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [name, color, glyph]);
	return source;
}

export type MaterialSymbolName = Parameters<
	typeof unstable_getMaterialSymbolSourceAsync
>[0];

export function MaterialIcon({
	color,
	glyph = 22,
	name,
}: {
	color: string;
	glyph?: number;
	name: MaterialSymbolName;
}) {
	const source = useMaterialSymbol(name, color, glyph);
	if (!source) {
		return null;
	}
	return <Icon size={glyph} source={source} tint={color} />;
}

/**
 * The line between two halves of a card. A hand-drawn hairline rather than
 * Material's `Divider`, whose own colour is derived from the M3 outline role
 * and reads grey-blue against this palette's warm `hairline`.
 */
export function Rule({ palette }: { palette: CalcPalette }) {
	return (
		<Box
			modifiers={[fillMaxWidth(), heightOf(1), background(palette.hairline)]}
		/>
	);
}

export function Caption({
	children,
	color,
}: {
	children: string;
	color: string;
}) {
	return (
		<Text
			color={color}
			style={{ ...rounded(12, "semibold"), letterSpacing: 0.6 }}
		>
			{children}
		</Text>
	);
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
		<Box modifiers={[heightOf(SUBTEXT_H)]}>
			<Text color={color} style={rounded(15, "semibold")}>
				{children}
			</Text>
		</Box>
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
		<Box modifiers={[heightOf(DELTA_H)]}>
			<Text color={color} style={rounded(12, "semibold")}>
				{children}
			</Text>
		</Box>
	);
}

/**
 * The bar that says which field the keypad is aimed at.
 *
 * Solid where iOS blinks it. `@expo/ui`'s Compose tree has no repeating
 * animation spec, and driving the fade from JavaScript would re-render the
 * numerals beside it twice a second — which is exactly what the iOS version
 * isolates itself to avoid. The caption turning orange says the same thing.
 */
export function Caret({ on, size: glyph }: { on: boolean; size: number }) {
	if (!on) {
		return null;
	}
	// The row aligns on box bottoms, and a text's box bottom sits a descender
	// below its baseline while a bare bar's does not — so without this the caret
	// hangs under the numeral. Same correction the SwiftUI caret makes.
	//
	// The padding comes first because the array *is* the Compose modifier chain:
	// `padding(bottom).size(w, h)` measures `h + bottom` and draws the bar in the
	// top `h`, which lands it on the baseline. `offset` would move the paint
	// without changing the measured box, so the 2dp gap to the numeral would be
	// measured off the wrong edge and the bar would drift into the digits.
	return (
		<Box
			modifiers={[
				padding(0, 0, 0, s(glyph * CARET_DESCENDER)),
				size(s(CARET_WIDTH), s(glyph * CARET_HEIGHT)),
				clip(Shapes.RoundedCorner(s(CARET_WIDTH))),
				background(ACCENT),
			]}
		/>
	);
}

export function Metric({
	active = false,
	color,
	label,
	onPress,
	palette,
	subtext,
	value,
}: {
	active?: boolean;
	color: string;
	label: string;
	onPress?: () => void;
	palette: CalcPalette;
	subtext?: string;
	value: string;
}) {
	return (
		<Column
			modifiers={onPress ? [clickable(onPress)] : []}
			verticalArrangement={{ spacedBy: 2 }}
		>
			<Caption color={active ? ACCENT : palette.label}>{label}</Caption>
			<Row horizontalArrangement={{ spacedBy: 2 }} verticalAlignment="bottom">
				<Text color={color} style={rounded(METRIC_VALUE, "semibold")}>
					{value}
				</Text>
				<Caret on={active} size={METRIC_VALUE} />
			</Row>
			{subtext === undefined ? null : (
				<Subtext color={palette.subtext}>{subtext}</Subtext>
			)}
		</Column>
	);
}

/**
 * Unlike a SwiftUI glass button, a Compose `Button` honours a frame directly,
 * so the fill goes on the button and the label just sits in it. The content
 * padding has to be zeroed or Material's default 24dp blows the columns out.
 */
export function Key({
	active = false,
	label,
	onPress,
	span = 1,
}: {
	active?: boolean;
	label: string;
	onPress: (label: string) => void;
	span?: number;
}) {
	const handlePress = useCallback(() => onPress(label), [label, onPress]);
	// A word key is sized by its label: RECUT has to fit the same column a
	// single digit sits in with room to spare.
	const glyph = label.length <= 1;
	return (
		<Button
			colors={{
				containerColor: active ? ACCENT : KEY_TINT,
				contentColor: active ? ON_ACCENT : KEY_LABEL,
			}}
			contentPadding={{ bottom: 0, end: 0, start: 0, top: 0 }}
			modifiers={[
				weight(span),
				fillMaxHeight(),
				clip(Shapes.RoundedCorner(KEY_RADIUS)),
			]}
			onClick={handlePress}
		>
			<Text
				color={active ? ON_ACCENT : KEY_LABEL}
				style={rounded(glyph ? 28 : 15, glyph ? "medium" : "semibold")}
			>
				{label}
			</Text>
		</Button>
	);
}

/** Split out so each option owns one stable handler, not one per render. */
function SegmentedOption<T extends string>({
	onChange,
	option,
	palette,
	selected,
}: {
	onChange: (next: T) => void;
	option: { title: string; value: T };
	palette: CalcPalette;
	selected: boolean;
}) {
	const handleClick = useCallback(
		() => onChange(option.value),
		[onChange, option.value]
	);
	return (
		<SegmentedButton
			colors={{
				activeBorderColor: ACCENT,
				activeContainerColor: ACCENT,
				activeContentColor: ON_ACCENT,
				inactiveBorderColor: palette.hairline,
				inactiveContainerColor: palette.surface,
				inactiveContentColor: palette.label,
			}}
			onClick={handleClick}
			selected={selected}
		>
			<SegmentedButton.Label>
				{/* `$/CT` and `TOTAL` share half the keypad's width — let either wrap
				    and the row grows a second line and pushes past the card. */}
				<Text maxLines={1} softWrap={false} style={rounded(12, "semibold")}>
					{option.title}
				</Text>
			</SegmentedButton.Label>
		</SegmentedButton>
	);
}

export function SegmentedRow<T extends string>({
	onChange,
	options,
	palette,
	selection,
}: {
	onChange: (next: T) => void;
	options: { title: string; value: T }[];
	palette: CalcPalette;
	selection: T;
}) {
	return (
		<SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
			{options.map((option) => (
				<SegmentedOption
					key={option.value}
					onChange={onChange}
					option={option}
					palette={palette}
					selected={option.value === selection}
				/>
			))}
		</SingleChoiceSegmentedButtonRow>
	);
}

/**
 * The Compose half of the keypad; the SwiftUI `Keypad` says why the segmented
 * CT / $/CT / TOTAL picker that used to end this row is gone and what took its
 * place — the two have to stay the same instrument.
 *
 * `Grid` has no Compose counterpart, so four weighted rows stand in for it and
 * `span={2}` covers the two columns the picker used to take.
 */
export function Keypad({
	actionKey,
	onBackspace,
	onClear,
	onDigit,
	onDot,
}: {
	actionKey: ReactNode;
	onBackspace: () => void;
	onClear: () => void;
	onDigit: (digit: string) => void;
	onDot: () => void;
}) {
	const [top, middle, bottom] = DIGIT_ROWS;
	const rows = [
		{
			keys: top,
			tail: <Key label="⌫" onPress={onBackspace} />,
		},
		{
			keys: middle,
			tail: <Key label="C" onPress={onClear} />,
		},
		{ keys: bottom, tail: actionKey },
	];

	return (
		// Height comes from `KEYPAD_H`, not from the leftover space: the keypad
		// sits at the bottom and the cards above take the slack.
		<Column
			modifiers={[heightOf(KEYPAD_H), fillMaxWidth()]}
			verticalArrangement={{ spacedBy: KEY_GAP }}
		>
			{rows.map((row) => (
				<Row
					horizontalArrangement={{ spacedBy: KEY_GAP }}
					key={row.keys.join()}
					modifiers={[weight(1), fillMaxWidth()]}
				>
					{row.keys.map((digit) => (
						<Key key={digit} label={digit} onPress={onDigit} />
					))}
					{row.tail}
				</Row>
			))}
			<Row
				horizontalArrangement={{ spacedBy: KEY_GAP }}
				modifiers={[weight(1), fillMaxWidth()]}
			>
				<Key label="." onPress={onDot} />
				<Key label="0" onPress={onDigit} />
				<Key label={HIDE_GLYPH} onPress={hideKeypad} span={2} />
			</Row>
		</Column>
	);
}

/**
 * The discount tape, in a tonal trough.
 *
 * Material's slider is gone from here: a back runs -100 to +100 and is quoted to
 * the half, which is more precision than any track a phone can hold. `CalcRuler`
 * has the whole control; Compose supplies the surface it sits on and the box it
 * sits in, the same division of labour `ComposeWheel` runs on.
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

	return (
		<Column
			modifiers={[padding(18, 0, 18, 0), fillMaxWidth()]}
			verticalArrangement={{ spacedBy: s(4) }}
		>
			<Row
				horizontalArrangement={{ spacedBy: s(8) }}
				modifiers={[fillMaxWidth()]}
				verticalAlignment="center"
			>
				{guides ? (
					<Caption color={captionColor}>DISCOUNT OFF LIST</Caption>
				) : null}
				<Spacer modifiers={[weight(1)]} />
				<StepPill half={half} onPress={toggleStep} palette={palette} />
			</Row>
			{/* The recess is a layer behind the tape, not the box around it. It has
			    to be: a rounded trough in Compose means `clip`, `clip` cuts its
			    children, and the lens stands taller than the recess by design. So the
			    outer box only reserves the height, the recess paints inside it, and
			    the tape — margins and all — fills the whole of it on top. */}
			<Box
				contentAlignment="center"
				modifiers={[fillMaxWidth(), heightOf(RULER_STRIP_H)]}
			>
				<Box
					modifiers={[
						fillMaxWidth(),
						heightOf(RULER_TROUGH_H),
						clip(Shapes.RoundedCorner(TROUGH_RADIUS)),
						background(palette.surface),
					]}
				/>
				<RNHostView modifiers={[fillMaxWidth(), fillMaxHeight()]}>
					<CalcRuler
						onChange={onChange}
						palette={palette}
						step={step}
						value={value}
					/>
				</RNHostView>
			</Box>
		</Column>
	);
}

/** Android's answer to the glass ½ button: the same tonal pill a key is. */
function StepPill({
	half,
	onPress,
	palette,
}: {
	half: boolean;
	onPress: () => void;
	palette: CalcPalette;
}) {
	return (
		<Box
			contentAlignment="center"
			modifiers={[
				size(s(30), s(22)),
				clip(Shapes.RoundedCorner(s(11))),
				background(half ? ACCENT : palette.hairline),
				clickable(onPress),
			]}
		>
			<Text
				color={half ? ON_ACCENT : palette.primary}
				style={rounded(14, "semibold")}
			>
				½
			</Text>
		</Box>
	);
}

/**
 * The grade rotor, hosted inside the Compose tree.
 *
 * `RNHostView` is what lets a React Native subtree be laid out by Compose —
 * needed here because Material 3 has no wheel and this one is hand-rolled in
 * RN. With `matchContents` off it fills the box Compose gives it, so the size
 * is decided here rather than negotiated across the bridge.
 */
export function ComposeWheel({
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
	label: string | null;
	labelColor: string;
	onChange: (next: string) => void;
	options: { title: string; value: string }[];
	palette: CalcPalette;
	selection: string;
	width: number;
}) {
	return (
		<Box modifiers={[widthOf(width), heightOf(height)]}>
			<RNHostView modifiers={[fillMaxWidth(), fillMaxHeight()]}>
				<CalcWheel
					height={height}
					label={label}
					labelColor={labelColor}
					onChange={onChange}
					options={options}
					palette={palette}
					selection={selection}
					width={width}
				/>
			</RNHostView>
		</Box>
	);
}

/** Round glass button's Android counterpart: a filled tonal icon button. */
export function RoundIconButton({
	children,
	onPress,
	palette,
}: {
	children: ReactNode;
	onPress: () => void;
	palette: CalcPalette;
}) {
	return (
		<Box
			contentAlignment="center"
			modifiers={[
				size(ICON_BUTTON, ICON_BUTTON),
				clip(Shapes.Circle),
				background(palette.surface),
				clickable(onPress),
			]}
		>
			{children}
		</Box>
	);
}
