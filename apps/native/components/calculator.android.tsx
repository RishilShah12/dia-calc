import { Column, Host, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import {
	clickable,
	fillMaxSize,
	fillMaxWidth,
	padding,
	weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	BLOCK_GAP,
	CARD_PADDING,
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
	Metric,
	Rule,
	rounded,
	Subtext,
} from "@/components/calc-kit-compose";
import { ProfileSheet } from "@/components/calc-profile";
import { ACCENT } from "@/components/calc-theme";
import { usePolishCalc } from "@/hooks/use-polish-calc";

/**
 * The polish screen in Jetpack Compose. Everything it draws comes from
 * `usePolishCalc`, the same hook the SwiftUI screen renders from — what stays
 * here is only how Android says it.
 */

/** Named because the caret beside each has to be cut to the same size. */
const CARAT_VALUE = 38;
const TOTAL_VALUE = 30;
const GRADES_PAD_V = s(12);

export function Calculator() {
	const calc = usePolishCalc();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();

	const { palette, readout, target } = calc;
	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const wheelLabel = (text: string) => (calc.guides ? text : null);

	return (
		<Host
			colorScheme={calc.scheme}
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			{/* Only the bottom inset is ours: the navigator's header owns the top
			    one, and adding it here again is a double gap. */}
			<Column
				modifiers={[
					fillMaxSize(),
					padding(
						SCREEN_PADDING,
						BLOCK_GAP,
						SCREEN_PADDING,
						insets.bottom + BLOCK_GAP
					),
				]}
				verticalArrangement={{ spacedBy: BLOCK_GAP }}
			>
				<ProfileSheet />

				{/* Hugs its content rather than filling: the readout is a fixed
				    number of lines, and the slack it used to claim is worth more
				    under the wheels and the discount tape. */}
				<CalcCard
					grow={false}
					pad={CARD_PADDING}
					palette={palette}
					scheme={calc.scheme}
					spacing={s(10)}
				>
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
									style={rounded(CARAT_VALUE, "bold")}
								>
									{readout.caratText}
								</Text>
								<Caret on={target === "carat"} size={CARAT_VALUE} />
							</Row>
							<Subtext color={palette.subtext}>{readout.caratWas}</Subtext>
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
								<Text color={ACCENT} style={rounded(TOTAL_VALUE, "bold")}>
									{readout.totalText}
								</Text>
								<Caret on={target === "total"} size={TOTAL_VALUE} />
							</Row>
							<Subtext color={palette.subtext}>{readout.totalWas}</Subtext>
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
							subtext={readout.listWas}
							value={readout.listText}
						/>
						<Metric
							active={target === "net"}
							color={ACCENT}
							label="PRICE / CT"
							onPress={calc.selectNet}
							palette={palette}
							subtext={readout.netWas}
							value={readout.netText}
						/>
						<Metric
							color={palette.primary}
							label="DISCOUNT"
							palette={palette}
							subtext={readout.backWas}
							value={readout.backText}
						/>
					</Row>
				</CalcCard>

				{/* Grades and discount are one decision about one stone, so they are
				    one card — a rule separates them, not a gap. */}
				<CalcCard
					padV={GRADES_PAD_V}
					palette={palette}
					scheme={calc.scheme}
					spacing={s(8)}
				>
					<Row modifiers={[fillMaxWidth()]}>
						<ComposeWheel
							label={wheelLabel("SHAPE")}
							labelColor={calc.captionColor}
							onChange={calc.onShape}
							options={calc.shapeOptions}
							palette={palette}
							selection={calc.shapeName}
							width={wheelWidth}
						/>
						<ComposeWheel
							label={wheelLabel("COLOR")}
							labelColor={calc.captionColor}
							onChange={calc.onColor}
							options={calc.colorOptions}
							palette={palette}
							selection={calc.color}
							width={wheelWidth}
						/>
						<ComposeWheel
							label={wheelLabel("CLARITY")}
							labelColor={calc.captionColor}
							onChange={calc.onClarity}
							options={calc.clarityOptions}
							palette={palette}
							selection={calc.clarity}
							width={wheelWidth}
						/>
					</Row>

					<Rule palette={palette} />

					<DiscountSlider
						captionColor={calc.captionColor}
						guides={calc.guides}
						onChange={calc.handleDiscount}
						palette={palette}
						value={calc.sliderValue}
					/>
				</CalcCard>

				<Keypad
					actionKey={
						<Key active={calc.recut} label="RECUT" onPress={calc.toggleRecut} />
					}
					onBackspace={calc.handleBackspace}
					onClear={calc.handleClear}
					onDigit={calc.handleDigit}
					onDot={calc.handleDot}
					onSelectTarget={calc.selectTarget}
					palette={palette}
					target={target}
				/>
			</Column>
		</Host>
	);
}
