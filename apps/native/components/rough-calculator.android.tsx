import { useKeypadHidden } from "@dia-calc/calc/keypad-visible";
import { type RoughSummary, usd } from "@dia-calc/calc/rap-calc";
import {
	money,
	type Part,
	type PartQuote,
	partLabel,
	pct,
} from "@dia-calc/calc/rough";
import { findShape } from "@dia-calc/calc/shapes";
import {
	Column,
	Host,
	ModalBottomSheet,
	Row,
	Spacer,
	Text,
} from "@expo/ui/jetpack-compose";
import {
	clickable,
	fillMaxSize,
	fillMaxWidth,
	padding,
	weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	BLOCK_GAP,
	DESTRUCTIVE,
	KEYPAD_H,
	SCREEN_PADDING,
	s,
} from "@/components/calc-base";
import {
	CalcCard,
	Caption,
	Caret,
	ComposeWheel,
	DiscountSlider,
	Key,
	Keypad,
	MaterialIcon,
	Metric,
	RoundIconButton,
	Rule,
	rounded,
	SegmentedRow,
} from "@/components/calc-kit-compose";
import { ProfileSheet } from "@/components/calc-profile";
import { ACCENT, type CalcPalette } from "@/components/calc-theme";
import { useRoughCalc } from "@/hooks/use-rough-calc";

/**
 * The rough calculator in Jetpack Compose, off the same `useRoughCalc` the
 * SwiftUI screen uses.
 *
 * Rough fits four blocks between the header and the keypad where polish fits
 * two, so everything above the keypad is authored tighter — the same knobs the
 * iOS screen turns, for the same reason.
 */

const ROUGH_CARD_PADDING = s(13);
const ROUGH_WHEEL_HEIGHT = s(96);
/** As on iOS: the keypad's height less the totals card that stands in its place. */
const ROUGH_WHEEL_TALL = ROUGH_WHEEL_HEIGHT + KEYPAD_H - s(112);
const ROUGH_VALUE = 30;
const PART_CARAT = 32;
const PART_TOTAL = 27;

function PartRow({
	active,
	deletable,
	index,
	onDelete,
	onSelect,
	palette,
	part,
	partQuote,
}: {
	active: boolean;
	deletable: boolean;
	index: number;
	onDelete: (index: number) => void;
	onSelect: (index: number) => void;
	palette: CalcPalette;
	part: Part;
	partQuote: PartQuote;
}) {
	const handleSelect = useCallback(() => onSelect(index), [index, onSelect]);
	const handleDelete = useCallback(() => onDelete(index), [index, onDelete]);
	const grade = `${findShape(part.shapeName).abbr} ${part.color.toUpperCase()} ${part.clarity.toUpperCase()}`;

	return (
		<Row
			horizontalArrangement={{ spacedBy: 12 }}
			modifiers={[
				clickable(handleSelect),
				fillMaxWidth(),
				padding(SCREEN_PADDING, s(8), s(8), s(8)),
			]}
			verticalAlignment="center"
		>
			<Text color={active ? ACCENT : palette.label} style={rounded(19, "bold")}>
				{partLabel(index)}
			</Text>
			<Column verticalArrangement={{ spacedBy: 2 }}>
				<Text color={palette.primary} style={rounded(17, "semibold")}>
					{`${partQuote.carat.toFixed(2)} ct`}
				</Text>
				<Text color={palette.subtle} style={rounded(12)}>
					{grade}
				</Text>
			</Column>
			<Spacer modifiers={[weight(1)]} />
			<Column horizontalAlignment="end" verticalArrangement={{ spacedBy: 2 }}>
				<Text color={ACCENT} style={rounded(17, "semibold")}>
					{money(partQuote.total, partQuote.priced)}
				</Text>
				<Text color={palette.subtle} style={rounded(12)}>
					{pct(partQuote.backPct, partQuote.priced)}
				</Text>
			</Column>
			{/* Where iOS swipes to delete, Android puts the action on the row.
			    Compose has no swipe-to-dismiss here, and a visible trash is the
			    more discoverable pattern anyway. The last part cannot go: a rough
			    with no parts has nothing to price. */}
			{deletable ? (
				<RoundIconButton onPress={handleDelete} palette={palette}>
					<MaterialIcon color={DESTRUCTIVE} glyph={20} name="delete" />
				</RoundIconButton>
			) : null}
		</Row>
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
		<Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
			<Caption color={palette.label}>{label}</Caption>
			<Spacer modifiers={[weight(1)]} />
			<Text color={palette.primary} style={rounded(16, "semibold")}>
				{value}
			</Text>
		</Row>
	);
}

/**
 * Every part side by side, which the main screen cannot show — the wheels and
 * the slider only ever address one part.
 */
function PartsSheet({
	activeIndex,
	onClose,
	onDelete,
	onSelect,
	palette,
	parts,
	quotes,
	roughText,
	summary,
}: {
	activeIndex: number;
	onClose: () => void;
	onDelete: (index: number) => void;
	onSelect: (index: number) => void;
	palette: CalcPalette;
	parts: Part[];
	quotes: PartQuote[];
	roughText: string;
	summary: RoughSummary;
}) {
	const deletable = parts.length > 1;
	return (
		<ModalBottomSheet
			containerColor={palette.background}
			contentColor={palette.primary}
			onDismissRequest={onClose}
			showDragHandle
		>
			<Column modifiers={[fillMaxWidth(), padding(0, 0, 0, s(24))]}>
				{/* A plain `Column`, not a `LazyColumn`: a lazy list inside a sheet's
				    column is measured with unbounded height and Compose throws. Parts
				    are capped at A-Z anyway, so there is nothing to virtualise. */}
				<Column modifiers={[fillMaxWidth()]}>
					{parts.map((part, index) => {
						const partQuote = quotes[index];
						if (!partQuote) {
							return null;
						}
						return (
							<PartRow
								active={index === activeIndex}
								deletable={deletable}
								index={index}
								key={partLabel(index)}
								onDelete={onDelete}
								onSelect={onSelect}
								palette={palette}
								part={part}
								partQuote={partQuote}
							/>
						);
					})}
				</Column>
				<Column
					modifiers={[fillMaxWidth(), padding(24, s(16), 24, s(16))]}
					verticalArrangement={{ spacedBy: s(8) }}
				>
					<Rule palette={palette} />
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
				</Column>
			</Column>
		</ModalBottomSheet>
	);
}

export function RoughCalculator() {
	const calc = useRoughCalc();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();

	const { activePart, activeQuote, palette, summary, target } = calc;
	const keypadHidden = useKeypadHidden();
	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const wheelHeight = keypadHidden ? ROUGH_WHEEL_TALL : ROUGH_WHEEL_HEIGHT;
	const wheelLabel = (text: string) => (calc.guides ? text : null);
	const closeParts = useCallback(
		() => calc.setPartsOpen(false),
		[calc.setPartsOpen]
	);
	const partOptions = calc.parts.map((_, index) => ({
		title: partLabel(index),
		value: String(index),
	}));

	return (
		<Host
			colorScheme={calc.scheme}
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			<Column
				modifiers={[
					fillMaxSize(),
					padding(SCREEN_PADDING, BLOCK_GAP, SCREEN_PADDING, insets.bottom),
				]}
				verticalArrangement={{ spacedBy: BLOCK_GAP }}
			>
				<ProfileSheet />
				{calc.partsOpen ? (
					<PartsSheet
						activeIndex={calc.active}
						onClose={closeParts}
						onDelete={calc.deletePart}
						onSelect={calc.selectPartFromSheet}
						palette={palette}
						parts={calc.parts}
						quotes={calc.quotes}
						roughText={calc.roughText}
						summary={summary}
					/>
				) : null}

				{/* The bottom line. Pinned above the part editor because it is the
				    number every other control on the screen is aimed at. */}
				<CalcCard
					grow={false}
					pad={ROUGH_CARD_PADDING}
					palette={palette}
					scheme={calc.scheme}
					spacing={s(4)}
				>
					<Row modifiers={[fillMaxWidth()]}>
						<Column
							modifiers={[clickable(calc.selectRough)]}
							verticalArrangement={{ spacedBy: 2 }}
						>
							<Caption color={target === "rough" ? ACCENT : palette.label}>
								ROUGH WT
							</Caption>
							<Row
								horizontalArrangement={{ spacedBy: 2 }}
								verticalAlignment="bottom"
							>
								<Text
									color={palette.primary}
									style={rounded(ROUGH_VALUE, "bold")}
								>
									{calc.roughText || "0"}
								</Text>
								<Caret on={target === "rough"} size={ROUGH_VALUE} />
							</Row>
						</Column>
						<Spacer modifiers={[weight(1)]} />
						<Column
							horizontalAlignment="end"
							verticalArrangement={{ spacedBy: 2 }}
						>
							<Caption color={palette.label}>TOTAL VALUE</Caption>
							<Text color={ACCENT} style={rounded(ROUGH_VALUE, "bold")}>
								{usd(summary.total)}
							</Text>
						</Column>
					</Row>
					<Row modifiers={[fillMaxWidth()]}>
						<Text color={palette.subtext} style={rounded(15, "semibold")}>
							{`${summary.partsCarat.toFixed(2)} ct`}
						</Text>
						<Spacer modifiers={[weight(1)]} />
						<Text color={palette.subtext} style={rounded(15, "semibold")}>
							{`${usd(summary.perCarat, true)} /ct`}
						</Text>
					</Row>
				</CalcCard>

				{/* One part at a time: the wheels and the slider below can only ever
				    address one, so the picker says which. */}
				{/* Hugs its content rather than growing. Rough fits four blocks, and
				    two greedy cards split the slack evenly even though this one holds
				    far more — which starved it and clipped the metric row off the
				    bottom. The grades card below absorbs the slack instead. */}
				<CalcCard
					grow={false}
					pad={ROUGH_CARD_PADDING}
					palette={palette}
					scheme={calc.scheme}
					spacing={s(5)}
				>
					<Row
						horizontalArrangement={{ spacedBy: s(10) }}
						modifiers={[fillMaxWidth()]}
						verticalAlignment="center"
					>
						{/* ponytail: segments squeeze as parts are added — swap for a
						    scrolling chip row if anyone plans more than about six. */}
						<Row modifiers={[weight(1)]}>
							<SegmentedRow
								onChange={calc.selectPart}
								options={partOptions}
								palette={palette}
								selection={String(calc.active)}
							/>
						</Row>
						<RoundIconButton onPress={calc.openParts} palette={palette}>
							<MaterialIcon color={palette.keyLabel} name="list" />
						</RoundIconButton>
						<RoundIconButton onPress={calc.addPart} palette={palette}>
							<MaterialIcon color={palette.keyLabel} name="add" />
						</RoundIconButton>
					</Row>

					<Row modifiers={[fillMaxWidth()]}>
						<Column
							modifiers={[clickable(calc.selectCarat)]}
							verticalArrangement={{ spacedBy: 2 }}
						>
							<Caption color={target === "carat" ? ACCENT : palette.label}>
								CARAT
							</Caption>
							<Row
								horizontalArrangement={{ spacedBy: 2 }}
								verticalAlignment="bottom"
							>
								<Text
									color={palette.primary}
									style={rounded(PART_CARAT, "bold")}
								>
									{activePart.caratText || "0"}
								</Text>
								<Caret on={target === "carat"} size={PART_CARAT} />
							</Row>
						</Column>
						<Spacer modifiers={[weight(1)]} />
						<Column
							horizontalAlignment="end"
							modifiers={[clickable(calc.selectTotal)]}
							verticalArrangement={{ spacedBy: 2 }}
						>
							<Caption color={target === "total" ? ACCENT : palette.label}>
								TOTAL
							</Caption>
							<Row
								horizontalArrangement={{ spacedBy: 2 }}
								verticalAlignment="bottom"
							>
								<Text color={ACCENT} style={rounded(PART_TOTAL, "bold")}>
									{money(activeQuote.total, activeQuote.priced)}
								</Text>
								<Caret on={target === "total"} size={PART_TOTAL} />
							</Row>
						</Column>
					</Row>

					<Rule palette={palette} />

					<Row
						horizontalArrangement="spaceBetween"
						modifiers={[fillMaxWidth()]}
					>
						<Metric
							color={palette.primary}
							label="RAP LIST"
							palette={palette}
							value={money(activeQuote.listPerCarat, activeQuote.priced)}
						/>
						<Metric
							active={target === "net"}
							color={ACCENT}
							label="PRICE / CT"
							onPress={calc.selectNet}
							palette={palette}
							value={money(activeQuote.netPerCarat, activeQuote.priced)}
						/>
						<Metric
							color={palette.primary}
							label="DISCOUNT"
							palette={palette}
							value={pct(activeQuote.backPct, activeQuote.priced)}
						/>
					</Row>
				</CalcCard>

				<CalcCard
					padV={s(8)}
					palette={palette}
					scheme={calc.scheme}
					spacing={s(5)}
				>
					<Row modifiers={[fillMaxWidth()]}>
						<ComposeWheel
							height={wheelHeight}
							label={wheelLabel("SHAPE")}
							labelColor={palette.label}
							onChange={calc.handleShape}
							options={calc.shapeOptions}
							palette={palette}
							selection={activePart.shapeName}
							width={wheelWidth}
						/>
						<ComposeWheel
							height={wheelHeight}
							label={wheelLabel("COLOR")}
							labelColor={palette.label}
							onChange={calc.handleColor}
							options={calc.colorOptions}
							palette={palette}
							selection={activePart.color}
							width={wheelWidth}
						/>
						<ComposeWheel
							height={wheelHeight}
							label={wheelLabel("CLARITY")}
							labelColor={palette.label}
							onChange={calc.handleClarity}
							options={calc.clarityOptions}
							palette={palette}
							selection={activePart.clarity}
							width={wheelWidth}
						/>
					</Row>

					<Rule palette={palette} />

					<DiscountSlider
						captionColor={palette.label}
						guides={calc.guides}
						onChange={calc.handleDiscount}
						palette={palette}
						value={calc.sliderValue}
					/>
				</CalcCard>

				{keypadHidden ? (
					/* The rough's totals, in the slot the keys were in. No per-part
					   rows — the card above already shows the part being edited. */
					<CalcCard
						grow={false}
						pad={ROUGH_CARD_PADDING}
						palette={palette}
						scheme={calc.scheme}
						spacing={s(4)}
					>
						<SummaryLine
							label="ROUGH"
							palette={palette}
							value={`${calc.roughText || "0"} ct`}
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
					</CalcCard>
				) : (
					<Keypad
						actionKey={
							<Key
								active={target === "rough"}
								label="ROUGH"
								onPress={calc.selectRough}
							/>
						}
						onBackspace={calc.handleBackspace}
						onClear={calc.handleClear}
						onDigit={calc.handleDigit}
						onDot={calc.handleDot}
					/>
				)}
			</Column>
		</Host>
	);
}
