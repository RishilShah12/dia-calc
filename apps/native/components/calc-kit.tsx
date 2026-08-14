import type { KeypadTarget } from "@dia-calc/calc/keypad";
import {
	BottomSheet,
	Button,
	Divider,
	GlassEffectContainer,
	Grid,
	HStack,
	Image,
	Picker,
	Slider,
	Spacer,
	Text,
	VStack,
} from "@expo/ui/swift-ui";
import {
	Animation,
	animation,
	buttonBorderShape,
	buttonStyle,
	clipped,
	contentTransition,
	font,
	foregroundStyle,
	frame,
	glassEffect,
	gridCellColumns,
	monospacedDigit,
	onTapGesture,
	padding,
	pickerStyle,
	presentationDetents,
	presentationDragIndicator,
	tag,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import { useCallback } from "react";
import { Dimensions } from "react-native";

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

/**
 * Every size below is authored for a 6.3" iPhone and multiplied by `SCALE`, so
 * the whole layout keeps its proportions down to an SE instead of overflowing.
 * Read once at module load: the app is portrait-locked, so this never changes.
 */
const REFERENCE_HEIGHT = 874;
const SCALE = Math.min(1, Dimensions.get("window").height / REFERENCE_HEIGHT);
export const s = (size: number) => Math.round(size * SCALE);

export const SCREEN_PADDING = 16;
export const BLOCK_GAP = s(8);

export const HEADER_H = s(40);
/** Square, so a circular glass button wraps a square glyph rather than an oval. */
const HEADER_GLYPH = s(22);
export const WHEEL_HEIGHT = s(110);
/** What a key row actually measures: the keypad never takes spare height. */
const KEY_MIN_HEIGHT = s(52);
const KEY_GAP = s(10);
/**
 * Four key rows and the three gaps between them, reserved rather than left to
 * the layout to negotiate. The cards above are greedy, and on a screen with
 * more blocks than slack they win that negotiation and squeeze the bottom row
 * of keys off the screen — which is exactly what the rough screen does.
 */
const KEYPAD_H = KEY_MIN_HEIGHT * 4 + KEY_GAP * 3;
/** Wide enough for "● RAP 12 AUG" so the header can never reflow. */
const RAP_PILL_W = s(132);
/** Reserved whether or not a subtext is showing. */
const SUBTEXT_H = s(14);
export const CARD_PADDING = s(18);

/** Keys read as a dark slab in both appearances, as in the design. */
const KEY_TINT = "#3A3735";
/** SwiftUI's `.infinity` has no JSON form; this is large enough to fill. */
export const FILL = 10_000;

/** The slider covers list price down to zero in 1% steps — 100 of them. */
export const MIN_BACK = -100;
export const MAX_BACK = 0;

export const EMPTY = "—";

export const GLASS_CARD = glassEffect({
	cornerRadius: 28,
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

const DIGIT_ROWS = [
	["7", "8", "9"],
	["4", "5", "6"],
	["1", "2", "3"],
] as const;

/** Abbreviated hard: three segments share half the keypad's width. */
const KEYPAD_TARGETS: { title: string; value: KeypadTarget }[] = [
	{ title: "CT", value: "carat" },
	{ title: "$/CT", value: "net" },
	{ title: "TOTAL", value: "total" },
];

const MONTHS = [
	"JAN",
	"FEB",
	"MAR",
	"APR",
	"MAY",
	"JUN",
	"JUL",
	"AUG",
	"SEP",
	"OCT",
	"NOV",
	"DEC",
];

/** `2026-08-07` → `7 AUG`. Short and near-constant width, unlike the ISO form. */
function formatRapDate(iso: string | undefined): string {
	if (!iso) {
		return EMPTY;
	}
	const [, month, day] = iso.split("-");
	const index = Number.parseInt(month ?? "", 10) - 1;
	const name = MONTHS[index];
	if (!(name && day)) {
		return iso;
	}
	return `${Number.parseInt(day, 10)} ${name}`;
}

/**
 * A typed total is a per-carat price the dealer hasn't divided yet, which is
 * all it takes for `quote` to derive the discount off it. No weight yet means
 * no price yet — never a division by zero.
 */
export const perCaratFromTotal = (total: number, carat: number) =>
	carat > 0 ? total / carat : 0;

/**
 * Which side of the pair the dealer last typed is the side that is authoritative;
 * `quote` derives the other. A total is fed in as the per-carat price it implies,
 * so all three edit targets end up in the same two-field solve.
 */
export function pricedBy(
	input: {
		backText: string;
		lastEdited: string;
		netText: string;
		totalText: string;
	},
	carat: number
): { backPct: number } | { netPerCarat: number } {
	if (input.lastEdited === "back") {
		return { backPct: Number.parseFloat(input.backText) || 0 };
	}
	if (input.lastEdited === "total") {
		return {
			netPerCarat: perCaratFromTotal(
				Number.parseFloat(input.totalText) || 0,
				carat
			),
		};
	}
	return { netPerCarat: Number.parseFloat(input.netText) || 0 };
}

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
				rounded(11, "medium"),
				foregroundStyle(color),
				monospacedDigit(),
				frame({ height: SUBTEXT_H }),
			]}
		>
			{children}
		</Text>
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
			<Text
				modifiers={[
					rounded(22, "semibold"),
					foregroundStyle(color),
					monospacedDigit(),
					contentTransition("numericText"),
					animation(Animation.default, animatedOn),
				]}
			>
				{value}
			</Text>
			{subtext === undefined ? null : (
				<Subtext color={palette.subtle}>{subtext}</Subtext>
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
	return (
		<VStack modifiers={[frame({ width })]} spacing={4}>
			{label ? <Caption color={labelColor}>{label}</Caption> : null}
			<Picker
				modifiers={[pickerStyle("wheel"), frame({ height, width }), clipped()]}
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
}: {
	active?: boolean;
	label: string;
	/** Receives the label, so digit keys can share one stable handler. */
	onPress: (label: string) => void;
	palette: CalcPalette;
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
 * The three fields the digits can land in — carat, price per carat and total —
 * are a segmented picker rather than three keys, because they are a choice of
 * one, not three actions. That frees the fourth column's third slot for
 * `actionKey`, which is the one thing the two calculators disagree about:
 * polish puts RECUT there, rough puts ROUGH.
 *
 * The discount is not among the targets; it belongs to the slider.
 */
export function Keypad({
	actionKey,
	onBackspace,
	onClear,
	onDigit,
	onDot,
	onSelectTarget,
	palette,
	target,
}: {
	/** Row three, column four. See above. */
	actionKey: React.ReactNode;
	onBackspace: () => void;
	onClear: () => void;
	onDigit: (digit: string) => void;
	onDot: () => void;
	onSelectTarget: (next: KeypadTarget) => void;
	palette: CalcPalette;
	target: KeypadTarget;
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
					<Picker
						modifiers={[
							pickerStyle("segmented"),
							gridCellColumns(2),
							frame({ maxHeight: FILL, maxWidth: FILL }),
						]}
						onSelectionChange={onSelectTarget}
						selection={target}
					>
						{KEYPAD_TARGETS.map((option) => (
							<Text
								key={option.value}
								modifiers={[tag(option.value), rounded(13, "semibold")]}
							>
								{option.title}
							</Text>
						))}
					</Picker>
				</Grid.Row>
			</Grid>
		</GlassEffectContainer>
	);
}

/**
 * The slider's own end labels. SwiftUI pins these to the ends of the track,
 * which a row of equal-width `Text`s underneath cannot do — those centre each
 * label in its own slot, leaving -100% floating a tenth of the way in.
 */
function EndLabel({ children, color }: { children: string; color: string }) {
	return (
		<Text
			modifiers={[
				rounded(10, "medium"),
				foregroundStyle(color),
				monospacedDigit(),
			]}
		>
			{children}
		</Text>
	);
}

/**
 * A glass button sizes itself to its label, so the glyph's frame is what
 * decides the shape: a square one plus a circular border reads as a round
 * button, where the tall frame this replaced read as an oval.
 */
export function RoundGlassButton({
	onPress,
	symbol,
}: {
	onPress: () => void;
	symbol:
		| "line.3.horizontal"
		| "list.bullet"
		| "person.crop.circle"
		| "plus"
		| "trash";
}) {
	return (
		<Button
			modifiers={[keyStyle, buttonBorderShape("circle"), tint(KEY_TINT)]}
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
 * Guides off strips the caption and the end labels, which leaves the live
 * reading nowhere to sit but beside the track.
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
	const reading = (
		<Text
			modifiers={[
				rounded(17, "bold"),
				foregroundStyle(ACCENT),
				monospacedDigit(),
				contentTransition("numericText"),
				animation(Animation.default, value),
			]}
		>
			{`${value.toFixed(0)}%`}
		</Text>
	);

	// No `step`: a stepped SwiftUI slider draws a tick per step, and a hundred
	// of them under the track is noise. `onChange` rounds instead.
	if (!guides) {
		return (
			<HStack modifiers={[padding({ horizontal: 18 })]} spacing={10}>
				<Slider
					max={MAX_BACK}
					min={MIN_BACK}
					modifiers={[frame({ maxWidth: FILL })]}
					onValueChange={onChange}
					value={value}
				/>
				{reading}
			</HStack>
		);
	}

	return (
		<VStack modifiers={[padding({ horizontal: 18 })]} spacing={2}>
			<HStack>
				<Caption color={captionColor}>DISCOUNT OFF LIST</Caption>
				<Spacer />
				{reading}
			</HStack>
			<Slider
				max={MAX_BACK}
				maximumValueLabel={<EndLabel color={palette.subtle}>0%</EndLabel>}
				min={MIN_BACK}
				minimumValueLabel={<EndLabel color={palette.subtle}>-100%</EndLabel>}
				onValueChange={onChange}
				value={value}
			/>
		</VStack>
	);
}

const SHEET_PADDING = 24;

function SheetRow({
	busy = false,
	label,
	onPress,
	symbol,
	tone,
	width,
}: {
	busy?: boolean;
	label: string;
	onPress: () => void;
	symbol: "arrow.clockwise" | "rectangle.portrait.and.arrow.right";
	tone: string;
	width: number;
}) {
	const title = busy ? "Refreshing…" : label;
	return (
		<Button
			modifiers={[keyStyle, tint(KEY_TINT), frame({ height: 52, width })]}
			onPress={onPress}
		>
			<HStack spacing={10}>
				<Image color={tone} size={17} systemName={symbol} />
				<Text modifiers={[rounded(16, "medium"), foregroundStyle(tone)]}>
					{title}
				</Text>
				<Spacer />
			</HStack>
		</Button>
	);
}

export function ProfileSheet({
	email,
	isPresented,
	name,
	onIsPresentedChange,
	onOpen,
	onRefresh,
	onSignOut,
	palette,
	refreshing,
	width,
}: {
	email: string;
	isPresented: boolean;
	name: string;
	onIsPresentedChange: (next: boolean) => void;
	onOpen: () => void;
	onRefresh: () => void;
	onSignOut: () => void;
	palette: CalcPalette;
	refreshing: boolean;
	width: number;
}) {
	const rowWidth = width - SHEET_PADDING * 2;
	return (
		<BottomSheet
			anchor={<RoundGlassButton onPress={onOpen} symbol="person.crop.circle" />}
			isPresented={isPresented}
			modifiers={[
				presentationDetents(["large"]),
				presentationDragIndicator("visible"),
			]}
			onIsPresentedChange={onIsPresentedChange}
		>
			<VStack
				alignment="leading"
				modifiers={[padding({ all: SHEET_PADDING }), frame({ width })]}
				spacing={20}
			>
				<HStack spacing={14}>
					<Image
						color={ACCENT}
						size={44}
						systemName="person.crop.circle.fill"
					/>
					<VStack alignment="leading" spacing={2}>
						<Text
							modifiers={[
								rounded(20, "bold"),
								foregroundStyle(palette.primary),
							]}
						>
							{name}
						</Text>
						<Text modifiers={[rounded(13), foregroundStyle(palette.label)]}>
							{email}
						</Text>
					</VStack>
					<Spacer />
				</HStack>

				<Divider />

				<SheetRow
					busy={refreshing}
					label="Refresh Rap price list"
					onPress={onRefresh}
					symbol="arrow.clockwise"
					tone={palette.primary}
					width={rowWidth}
				/>
				<SheetRow
					label="Sign out"
					onPress={onSignOut}
					symbol="rectangle.portrait.and.arrow.right"
					tone="#D9544D"
					width={rowWidth}
				/>
				<Spacer />
			</VStack>
		</BottomSheet>
	);
}

/** Fixed height and a fixed-width status pill, so the header can never reflow. */
export function Header({
	failed,
	listDate,
	onOpenDrawer,
	palette,
	profile,
}: {
	failed: boolean;
	listDate: string | undefined;
	onOpenDrawer: () => void;
	palette: CalcPalette;
	/** The profile sheet, whose anchor is the trailing button. */
	profile: React.ReactNode;
}) {
	const status = failed ? "● NO LIST" : `● RAP ${formatRapDate(listDate)}`;
	return (
		<HStack modifiers={[frame({ height: HEADER_H })]} spacing={10}>
			<RoundGlassButton onPress={onOpenDrawer} symbol="line.3.horizontal" />
			<Text modifiers={[rounded(23, "bold"), foregroundStyle(palette.primary)]}>
				EZ
				<Text modifiers={[foregroundStyle(ACCENT)]}>Calc</Text>
			</Text>
			<Spacer />
			<Text
				modifiers={[
					rounded(13, "semibold"),
					foregroundStyle(failed ? "#D9544D" : palette.label),
					monospacedDigit(),
					frame({ width: RAP_PILL_W }),
					padding({ vertical: 9 }),
					glassEffect({ shape: "capsule" }),
				]}
			>
				{status}
			</Text>
			{profile}
		</HStack>
	);
}
