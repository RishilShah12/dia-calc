import { type RoughSummary, usd } from "@dia-calc/calc/rap-calc";
import {
	money,
	type Part,
	type PartQuote,
	partLabel,
	pct,
} from "@dia-calc/calc/rough";
import { findShape, SHAPES } from "@dia-calc/calc/shapes";
import {
	BottomSheet,
	Button,
	Divider,
	Group,
	// Not the universal `Host` from `@expo/ui`: same component on iOS, but its
	// types drop `ignoreSafeArea: 'container'`.
	Host,
	HStack,
	List,
	Picker,
	Spacer,
	SwipeActions,
	Text,
	VStack,
} from "@expo/ui/swift-ui";
import {
	Animation,
	animation,
	contentTransition,
	foregroundStyle,
	frame,
	labelStyle,
	listRowBackground,
	listStyle,
	monospacedDigit,
	onTapGesture,
	padding,
	pickerStyle,
	presentationBackground,
	presentationDetents,
	presentationDragIndicator,
	scrollContentBackground,
	tag,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOCK_GAP, SCREEN_PADDING, s } from "@/components/calc-base";
import {
	Caption,
	Caret,
	DiscountSlider,
	FILL,
	GLASS_CARD,
	Key,
	Keypad,
	Metric,
	RoundGlassButton,
	rounded,
	Subtext,
	Wheel,
} from "@/components/calc-kit";
import { ProfileSheet } from "@/components/calc-profile";
import { ACCENT, type CalcPalette } from "@/components/calc-theme";
import { useRoughCalc } from "@/hooks/use-rough-calc";

/**
 * The rough calculator answers a different question from the polish one: not
 * "what is this stone worth" but "what can I pay for this rough". The dealer
 * enters a rough weight, plans the parts they would cut from it, grades each,
 * and reads one number off the top — value per carat of rough.
 *
 * Each part is priced exactly like a polished stone, so there is no second
 * pricing model here. `summarizeRough` only sums the parts and divides by the
 * rough. Everything else is layout.
 *
 * Layout rule, inherited from the polish screen: header at the top and keypad
 * at the bottom, both at their own height, and the cards between them absorb
 * whatever the screen has spare.
 */

/**
 * Rough fits four blocks between the header and the keypad where polish fits
 * two, so everything above the keypad is authored tighter. These are the knobs
 * that buy the ~90pt the extra card costs; without them the keypad's bottom row
 * runs off a 6.3" screen.
 */
const ROUGH_CARD_PADDING = s(13);
const ROUGH_WHEEL_HEIGHT = s(96);
const ROUGH_VALUE = 30;
const PART_CARAT = 32;
const PART_TOTAL = 27;

function PartRow({
	active,
	index,
	onSelect,
	palette,
	part,
	partQuote,
}: {
	active: boolean;
	index: number;
	onSelect: (index: number) => void;
	palette: CalcPalette;
	part: Part;
	partQuote: PartQuote;
}) {
	const handleSelect = useCallback(() => onSelect(index), [index, onSelect]);
	const grade = `${findShape(part.shapeName).abbr} ${part.color.toUpperCase()} ${part.clarity.toUpperCase()}`;
	return (
		<HStack
			modifiers={[
				onTapGesture(handleSelect),
				padding({ vertical: 4 }),
				listRowBackground("clear"),
			]}
			spacing={12}
		>
			<Text
				modifiers={[
					rounded(19, "bold"),
					foregroundStyle(active ? ACCENT : palette.label),
					frame({ width: s(22) }),
				]}
			>
				{partLabel(index)}
			</Text>
			<VStack alignment="leading" spacing={2}>
				<Text
					modifiers={[
						rounded(17, "semibold"),
						foregroundStyle(palette.primary),
						monospacedDigit(),
					]}
				>
					{`${partQuote.carat.toFixed(2)} ct`}
				</Text>
				<Text modifiers={[rounded(12), foregroundStyle(palette.subtle)]}>
					{grade}
				</Text>
			</VStack>
			<Spacer />
			<VStack alignment="trailing" spacing={2}>
				<Text
					modifiers={[
						rounded(17, "semibold"),
						foregroundStyle(ACCENT),
						monospacedDigit(),
					]}
				>
					{money(partQuote.total, partQuote.priced)}
				</Text>
				<Text
					modifiers={[
						rounded(12),
						foregroundStyle(palette.subtle),
						monospacedDigit(),
					]}
				>
					{pct(partQuote.backPct, partQuote.priced)}
				</Text>
			</VStack>
		</HStack>
	);
}

/**
 * Tinted rather than given SwiftUI's `destructive` role: the role reads to the
 * linter as an ARIA one, and the red is the same one the sign-out row uses.
 */
function DeleteAction({
	index,
	onDelete,
}: {
	index: number;
	onDelete: (index: number) => void;
}) {
	const handleDelete = useCallback(() => onDelete(index), [index, onDelete]);
	return (
		<Button
			label="Delete"
			modifiers={[tint("#D9544D"), labelStyle("iconOnly")]}
			onPress={handleDelete}
			systemImage="trash"
		/>
	);
}

function SummaryLine({
	label,
	palette,
	value,
}: {
	label: string;
	palette: CalcPalette;
	value: string;
}) {
	return (
		<HStack>
			<Caption color={palette.label}>{label}</Caption>
			<Spacer />
			<Text
				modifiers={[
					rounded(16, "semibold"),
					foregroundStyle(palette.primary),
					monospacedDigit(),
				]}
			>
				{value}
			</Text>
		</HStack>
	);
}

/**
 * Every part side by side, which the main screen cannot show — the wheels and
 * the slider only ever address one part. Deleting lives here too, behind a
 * swipe, so there is no destructive button next to the one that adds parts.
 */
function PartsSheet({
	activeIndex,
	isPresented,
	onDelete,
	onIsPresentedChange,
	onOpen,
	onSelect,
	palette,
	parts,
	quotes,
	roughText,
	summary,
	width,
}: {
	activeIndex: number;
	isPresented: boolean;
	onDelete: (index: number) => void;
	onIsPresentedChange: (next: boolean) => void;
	onOpen: () => void;
	onSelect: (index: number) => void;
	palette: CalcPalette;
	parts: Part[];
	quotes: PartQuote[];
	roughText: string;
	summary: RoughSummary;
	width: number;
}) {
	const deletable = parts.length > 1;
	return (
		<BottomSheet
			anchor={<RoundGlassButton onPress={onOpen} symbol="list.bullet" />}
			isPresented={isPresented}
			onIsPresentedChange={onIsPresentedChange}
		>
			{/* The presentation modifiers belong on the content. On `BottomSheet`
			    they apply to the anchor-plus-sheet composite, outside the
			    presentation context, and are quietly ignored — which is why this
			    sheet used to open at `large` no matter what it was told. */}
			<Group
				modifiers={[
					presentationDetents(["medium", "large"]),
					presentationDragIndicator("visible"),
					presentationBackground(palette.background),
				]}
			>
				<VStack modifiers={[frame({ width })]} spacing={0}>
					{/* `List` scrolls on its own, so a rough cut into a dozen parts needs
				    no extra plumbing here. Its own grouped background would paint
				    over the sheet's, so it is hidden and the rows take the palette. */}
					<List
						modifiers={[listStyle("plain"), scrollContentBackground("hidden")]}
					>
						{parts.map((part, index) => {
							const partQuote = quotes[index];
							if (!partQuote) {
								return null;
							}
							const row = (
								<PartRow
									active={index === activeIndex}
									index={index}
									onSelect={onSelect}
									palette={palette}
									part={part}
									partQuote={partQuote}
								/>
							);
							// The last part cannot be swiped away: a rough with no parts has
							// nothing to price, and the picker would have no segments.
							if (!deletable) {
								return row;
							}
							return (
								<SwipeActions
									key={partLabel(index)}
									modifiers={[listRowBackground("clear")]}
								>
									{row}
									<SwipeActions.Actions>
										<DeleteAction index={index} onDelete={onDelete} />
									</SwipeActions.Actions>
								</SwipeActions>
							);
						})}
					</List>

					<VStack
						modifiers={[padding({ horizontal: 24, vertical: 16 })]}
						spacing={8}
					>
						<Divider />
						<SummaryLine
							label="ROUGH"
							palette={palette}
							value={`${roughText || "0"} ct`}
						/>
						<SummaryLine
							label="PARTS"
							palette={palette}
							value={`${summary.partsCarat.toFixed(2)} ct`}
						/>
						<SummaryLine
							label="ALL PARTS"
							palette={palette}
							value={usd(summary.total)}
						/>
						<SummaryLine
							label="VALUE / CT"
							palette={palette}
							value={usd(summary.perCarat, true)}
						/>
					</VStack>
				</VStack>
			</Group>
		</BottomSheet>
	);
}

export function RoughCalculator() {
	const {
		active,
		activePart,
		activeQuote,
		addPart,
		deletePart,
		grid,
		guides,
		handleBackspace,
		handleClarity,
		handleClear,
		handleColor,
		handleDigit,
		handleDiscount,
		handleDot,
		handleShape,
		openParts,
		palette,
		parts,
		partsOpen,
		quotes,
		roughCarat,
		roughText,
		scheme,
		selectCarat,
		selectNet,
		selectPart,
		selectPartFromSheet,
		selectRough,
		selectTarget,
		selectTotal,
		setPartsOpen,
		sliderValue,
		summary,
		target,
	} = useRoughCalc();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();

	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const wheelLabel = (text: string) => (guides ? text : null);

	return (
		/* Only the bottom inset is ours: the navigator's header owns the top one,
		   and adding it here again is a double gap. */
		<Host
			colorScheme={scheme}
			ignoreSafeArea="container"
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			{/* The fill frame is what makes the screen edge to edge: without it the
			    column hugs its content and the host pins it to the top. */}
			<VStack
				modifiers={[
					padding({
						bottom: insets.bottom,
						horizontal: SCREEN_PADDING,
						top: BLOCK_GAP,
					}),
					frame({ maxHeight: FILL, maxWidth: FILL }),
				]}
				spacing={BLOCK_GAP}
			>
				<ProfileSheet />

				{/* The bottom line. It is pinned above the part editor because it is
				    the number every other control on the screen is aimed at. */}
				<VStack
					alignment="leading"
					modifiers={[
						padding({ all: ROUGH_CARD_PADDING }),
						frame({ maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(4)}
				>
					<HStack alignment="top">
						<VStack
							alignment="leading"
							modifiers={[onTapGesture(selectRough)]}
							spacing={2}
						>
							<Caption color={target === "rough" ? ACCENT : palette.label}>
								ROUGH WT
							</Caption>
							<HStack alignment="bottom" spacing={2}>
								<Text
									modifiers={[
										rounded(ROUGH_VALUE, "bold"),
										foregroundStyle(palette.primary),
										monospacedDigit(),
										contentTransition("numericText"),
										animation(Animation.default, roughCarat),
									]}
								>
									{roughText || "0"}
								</Text>
								<Caret on={target === "rough"} size={ROUGH_VALUE} />
							</HStack>
						</VStack>
						<Spacer />
						<VStack alignment="trailing" spacing={2}>
							<Caption color={palette.label}>TOTAL VALUE</Caption>
							<Text
								modifiers={[
									rounded(ROUGH_VALUE, "bold"),
									foregroundStyle(ACCENT),
									monospacedDigit(),
									contentTransition("numericText"),
									animation(Animation.default, summary.total),
								]}
							>
								{usd(summary.total)}
							</Text>
						</VStack>
					</HStack>
					<HStack>
						<Subtext color={palette.subtext}>
							{`${summary.partsCarat.toFixed(2)} ct`}
						</Subtext>
						<Spacer />
						<Subtext color={palette.subtext}>
							{`${usd(summary.perCarat, true)} /ct`}
						</Subtext>
					</HStack>
				</VStack>

				{/* One part at a time: the wheels and the slider below can only ever
				    address one, so the picker says which. */}
				<VStack
					alignment="leading"
					modifiers={[
						padding({ all: ROUGH_CARD_PADDING }),
						frame({ maxHeight: FILL, maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(5)}
				>
					<HStack spacing={s(10)}>
						<Picker
							modifiers={[pickerStyle("segmented"), frame({ maxWidth: FILL })]}
							onSelectionChange={selectPart}
							selection={String(active)}
						>
							{parts.map((_, index) => (
								<Text
									key={partLabel(index)}
									modifiers={[tag(String(index)), rounded(13, "semibold")]}
								>
									{partLabel(index)}
								</Text>
							))}
						</Picker>
						<PartsSheet
							activeIndex={active}
							isPresented={partsOpen}
							onDelete={deletePart}
							onIsPresentedChange={setPartsOpen}
							onOpen={openParts}
							onSelect={selectPartFromSheet}
							palette={palette}
							parts={parts}
							quotes={quotes}
							roughText={roughText}
							summary={summary}
							width={width}
						/>
						<RoundGlassButton onPress={addPart} symbol="plus" />
					</HStack>

					<HStack alignment="top">
						<VStack
							alignment="leading"
							modifiers={[onTapGesture(selectCarat)]}
							spacing={2}
						>
							<Caption color={target === "carat" ? ACCENT : palette.label}>
								CARAT
							</Caption>
							<HStack alignment="bottom" spacing={2}>
								<Text
									modifiers={[
										rounded(PART_CARAT, "bold"),
										foregroundStyle(palette.primary),
										monospacedDigit(),
										contentTransition("numericText"),
										animation(Animation.default, activeQuote.carat),
									]}
								>
									{activePart.caratText || "0"}
								</Text>
								<Caret on={target === "carat"} size={PART_CARAT} />
							</HStack>
						</VStack>
						<Spacer />
						<VStack
							alignment="trailing"
							modifiers={[onTapGesture(selectTotal)]}
							spacing={2}
						>
							<Caption color={target === "total" ? ACCENT : palette.label}>
								TOTAL
							</Caption>
							<HStack alignment="bottom" spacing={2}>
								<Text
									modifiers={[
										rounded(PART_TOTAL, "bold"),
										foregroundStyle(ACCENT),
										monospacedDigit(),
										contentTransition("numericText"),
										animation(Animation.default, activeQuote.total),
									]}
								>
									{money(activeQuote.total, activeQuote.priced)}
								</Text>
								<Caret on={target === "total"} size={PART_TOTAL} />
							</HStack>
						</VStack>
					</HStack>

					<Divider />

					<HStack>
						<Metric
							animatedOn={activeQuote.listPerCarat}
							color={palette.primary}
							label="RAP LIST"
							palette={palette}
							value={money(activeQuote.listPerCarat, activeQuote.priced)}
						/>
						<Spacer />
						<Metric
							active={target === "net"}
							animatedOn={activeQuote.netPerCarat}
							color={ACCENT}
							label="PRICE / CT"
							onTap={selectNet}
							palette={palette}
							value={money(activeQuote.netPerCarat, activeQuote.priced)}
						/>
						<Spacer />
						<Metric
							animatedOn={activeQuote.backPct}
							color={palette.primary}
							label="DISCOUNT"
							palette={palette}
							value={pct(activeQuote.backPct, activeQuote.priced)}
						/>
					</HStack>
				</VStack>

				{/* Grades and discount are one decision about one part, so they are
				    one card — a divider separates them, not a gap. */}
				<VStack
					modifiers={[
						padding({ vertical: s(8) }),
						frame({ maxHeight: FILL, maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(5)}
				>
					<HStack spacing={0}>
						<Wheel
							height={ROUGH_WHEEL_HEIGHT}
							label={wheelLabel("SHAPE")}
							labelColor={palette.label}
							onChange={handleShape}
							options={SHAPES.map((item) => ({
								title: item.abbr,
								value: item.name,
							}))}
							selection={activePart.shapeName}
							width={wheelWidth}
						/>
						<Wheel
							height={ROUGH_WHEEL_HEIGHT}
							label={wheelLabel("COLOR")}
							labelColor={palette.label}
							onChange={handleColor}
							options={(grid?.colors ?? []).map((c) => ({
								title: c.toUpperCase(),
								value: c,
							}))}
							selection={activePart.color}
							width={wheelWidth}
						/>
						<Wheel
							height={ROUGH_WHEEL_HEIGHT}
							label={wheelLabel("CLARITY")}
							labelColor={palette.label}
							onChange={handleClarity}
							options={(grid?.clarities ?? []).map((c) => ({
								title: c.toUpperCase(),
								value: c,
							}))}
							selection={activePart.clarity}
							width={wheelWidth}
						/>
					</HStack>

					<Divider />

					<DiscountSlider
						captionColor={palette.label}
						guides={guides}
						onChange={handleDiscount}
						palette={palette}
						value={sliderValue}
					/>
				</VStack>

				<Keypad
					actionKey={
						<Key
							active={target === "rough"}
							label="ROUGH"
							onPress={selectRough}
							palette={palette}
						/>
					}
					onBackspace={handleBackspace}
					onClear={handleClear}
					onDigit={handleDigit}
					onDot={handleDot}
					onSelectTarget={selectTarget}
					palette={palette}
					target={target}
				/>
			</VStack>
		</Host>
	);
}
