import { useKeypadHidden } from "@dia-calc/calc/keypad-visible";
import {
	Divider,
	// Not the universal `Host` from `@expo/ui`: same component on iOS, but its
	// types drop `ignoreSafeArea: 'container'`.
	Host,
	HStack,
	Spacer,
	Text,
	VStack,
} from "@expo/ui/swift-ui";
import {
	Animation,
	animation,
	contentTransition,
	foregroundStyle,
	frame,
	monospacedDigit,
	onTapGesture,
	padding,
} from "@expo/ui/swift-ui/modifiers";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	BLOCK_GAP,
	CARD_PADDING,
	SCREEN_PADDING,
	s,
	WHEEL_HEIGHT,
	WHEEL_HEIGHT_TALL,
} from "@/components/calc-base";
import {
	Caption,
	Caret,
	Delta,
	DiscountSlider,
	FILL,
	GLASS_CARD,
	Key,
	Keypad,
	Metric,
	rounded,
	Subtext,
	Wheel,
} from "@/components/calc-kit";
import { ProfileSheet } from "@/components/calc-profile";
import { ACCENT } from "@/components/calc-theme";
import { usePolishCalc } from "@/hooks/use-polish-calc";

/**
 * The polish screen's SwiftUI tree. Everything it draws comes from
 * `usePolishCalc`, which the Android screen renders from too — what stays here
 * is only how iOS says it.
 */

/** Named because the caret beside each has to be cut to the same size. */
const CARAT_VALUE = 38;
const TOTAL_VALUE = 30;

export function Calculator() {
	const calc = usePolishCalc();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const keypadHidden = useKeypadHidden();

	const { palette, readout, target } = calc;
	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const wheelLabel = (text: string) => (calc.guides ? text : null);
	// The wheels are what the dismissed keypad's height goes to: the card would
	// otherwise grow into a box with a small rotor floating in it.
	const wheelHeight = keypadHidden ? WHEEL_HEIGHT_TALL : WHEEL_HEIGHT;

	return (
		/* Only the bottom inset is ours: the navigator's header owns the top one,
		   and adding it here again is a double gap. */
		<Host
			colorScheme={calc.scheme}
			ignoreSafeArea="container"
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			{/* The fill frame is what makes the screen edge to edge: without it the
			    column hugs its content and the host pins it to the top. */}
			<VStack
				modifiers={[
					padding({
						bottom: insets.bottom + BLOCK_GAP,
						horizontal: SCREEN_PADDING,
						top: BLOCK_GAP,
					}),
					frame({ maxHeight: FILL, maxWidth: FILL }),
				]}
				spacing={BLOCK_GAP}
			>
				<ProfileSheet />

				{/* Hugs its content rather than filling: the readout is a fixed
				    number of lines, and the slack it used to claim is worth more
				    under the wheels and the discount tape. */}
				<VStack
					alignment="leading"
					modifiers={[
						padding({ all: CARD_PADDING }),
						frame({ maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(10)}
				>
					<HStack alignment="top">
						<VStack
							alignment="leading"
							modifiers={[onTapGesture(calc.selectCarat)]}
							spacing={2}
						>
							<Caption color={target === "carat" ? ACCENT : palette.label}>
								CARAT
							</Caption>
							<HStack alignment="bottom" spacing={2}>
								<Text
									modifiers={[
										rounded(CARAT_VALUE, "bold"),
										foregroundStyle(palette.primary),
										monospacedDigit(),
										contentTransition("numericText"),
										animation(
											Animation.default,
											Number.parseFloat(readout.caratText) || 0
										),
									]}
								>
									{readout.caratText}
								</Text>
								<Caret on={target === "carat"} size={CARAT_VALUE} />
							</HStack>
							<Subtext color={palette.subtext}>{readout.caratWas}</Subtext>
						</VStack>
						<Spacer />
						<VStack
							alignment="trailing"
							modifiers={[onTapGesture(calc.selectTotal)]}
							spacing={2}
						>
							<Caption color={target === "total" ? ACCENT : palette.label}>
								TOTAL
							</Caption>
							<HStack alignment="bottom" spacing={2}>
								<Text
									modifiers={[
										rounded(TOTAL_VALUE, "bold"),
										foregroundStyle(ACCENT),
										monospacedDigit(),
										contentTransition("numericText"),
										animation(Animation.default, readout.total),
									]}
								>
									{readout.totalText}
								</Text>
								<Caret on={target === "total"} size={TOTAL_VALUE} />
							</HStack>
							<Subtext color={palette.subtext}>{readout.totalWas}</Subtext>
							{/* Under the sum, not beside it: the columns are top-aligned,
							    so the extra line hangs off the total without moving the
							    carat block. */}
							<Delta color={palette.subtext}>{readout.totalDelta}</Delta>
						</VStack>
					</HStack>

					<Divider />

					<HStack>
						<Metric
							animatedOn={readout.total}
							color={palette.primary}
							label="RAP LIST"
							palette={palette}
							subtext={readout.listWas}
							value={readout.listText}
						/>
						<Spacer />
						<Metric
							active={target === "net"}
							animatedOn={readout.netPerCarat}
							color={ACCENT}
							label="PRICE / CT"
							onTap={calc.selectNet}
							palette={palette}
							subtext={readout.netWas}
							value={readout.netText}
						/>
						<Spacer />
						<Metric
							animatedOn={readout.backPct}
							color={palette.primary}
							label="DISCOUNT"
							palette={palette}
							subtext={readout.backWas}
							value={readout.backText}
						/>
					</HStack>
				</VStack>

				{/* Grades and discount are one decision about one stone, so they
				    are one card — a divider separates them, not a gap.

				    Hugs its content too, so no child of the column is greedy: a
				    card that fills would take the height the wheel just gave back
				    and turn it into padding inside itself. With nothing to claim
				    it, the slack goes to the column, which centres it — a little
				    above the readout and a little under the keypad. */}
				<VStack
					modifiers={[
						padding({ vertical: s(12) }),
						frame({ maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(8)}
				>
					<HStack spacing={0}>
						<Wheel
							height={wheelHeight}
							label={wheelLabel("SHAPE")}
							labelColor={calc.captionColor}
							onChange={calc.onShape}
							options={calc.shapeOptions}
							selection={calc.shapeName}
							width={wheelWidth}
						/>
						<Wheel
							height={wheelHeight}
							label={wheelLabel("COLOR")}
							labelColor={calc.captionColor}
							onChange={calc.onColor}
							options={calc.colorOptions}
							selection={calc.color}
							width={wheelWidth}
						/>
						<Wheel
							height={wheelHeight}
							label={wheelLabel("CLARITY")}
							labelColor={calc.captionColor}
							onChange={calc.onClarity}
							options={calc.clarityOptions}
							selection={calc.clarity}
							width={wheelWidth}
						/>
					</HStack>

					<Divider />

					<DiscountSlider
						captionColor={calc.captionColor}
						guides={calc.guides}
						onChange={calc.handleDiscount}
						palette={palette}
						value={calc.sliderValue}
					/>
				</VStack>

				{keypadHidden ? null : (
					<Keypad
						actionKey={
							<Key
								active={calc.recut}
								label="RECUT"
								onPress={calc.toggleRecut}
								palette={palette}
							/>
						}
						onBackspace={calc.handleBackspace}
						onClear={calc.handleClear}
						onDigit={calc.handleDigit}
						onDot={calc.handleDot}
						palette={palette}
					/>
				)}
			</VStack>
		</Host>
	);
}
