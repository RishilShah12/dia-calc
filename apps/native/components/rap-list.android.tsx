import { formatBracket } from "@dia-calc/calc/rap-calc";
import { listLabel, RAP_LISTS } from "@dia-calc/calc/shapes";
import { Column, Host } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	BLOCK_GAP,
	CARD_PADDING,
	SCREEN_PADDING,
	s,
} from "@/components/calc-base";
import {
	CalcCard,
	ComposeWheel,
	SegmentedRow,
} from "@/components/calc-kit-compose";
import { ProfileSheet } from "@/components/calc-profile";
import { ACCENT } from "@/components/calc-theme";
import {
	type ListName,
	PriceCaption,
	PriceTable,
	PriceTablePlaceholder,
	useRapList,
} from "@/components/rap-price-table";

/**
 * The Android price list: a Jetpack Compose card of controls over the same
 * shared React Native table the iOS screen uses.
 *
 * The `Host` sizes itself to the card (`matchContents`) rather than filling the
 * screen, which is what leaves the table below it a real RN box to grow into.
 */

const WHEEL_H = s(84);

const styles = StyleSheet.create({
	fill: { flex: 1 },
	host: { marginTop: BLOCK_GAP },
});

export function RapList() {
	const rap = useRapList();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const { palette } = rap;

	const cardWidth = width - SCREEN_PADDING * 2 - CARD_PADDING * 2;
	const listOptions = RAP_LISTS.map((entry) => ({
		title: listLabel(entry),
		value: entry,
	}));

	return (
		<View
			style={[
				styles.fill,
				{
					backgroundColor: palette.background,
					paddingBottom: insets.bottom + BLOCK_GAP,
					paddingHorizontal: SCREEN_PADDING,
				},
			]}
		>
			<Host
				colorScheme={rap.scheme}
				matchContents={{ vertical: true }}
				seedColor={ACCENT}
				style={styles.host}
			>
				<Column modifiers={[fillMaxWidth()]}>
					<ProfileSheet />
					<CalcCard
						grow={false}
						pad={CARD_PADDING}
						palette={palette}
						scheme={rap.scheme}
					>
						<SegmentedRow<ListName>
							onChange={rap.handleList}
							options={listOptions}
							palette={palette}
							selection={rap.list}
						/>
						<ComposeWheel
							height={WHEEL_H}
							label={rap.guides ? "SIZE" : null}
							labelColor={palette.label}
							onChange={rap.handleBracket}
							options={rap.brackets.map((bracket, index) => ({
								title: formatBracket(bracket),
								value: String(index),
							}))}
							palette={palette}
							selection={String(rap.safeIndex)}
							width={cardWidth}
						/>
					</CalcCard>
				</Column>
			</Host>

			<PriceCaption
				palette={palette}
				picked={rap.picked}
				pickedPrice={rap.pickedPrice}
			/>

			{rap.grid ? (
				<PriceTable
					clarities={rap.grid.clarities}
					colors={rap.grid.colors}
					onPick={rap.setPicked}
					palette={palette}
					picked={rap.picked}
					prices={rap.prices}
				/>
			) : (
				<PriceTablePlaceholder isPending={rap.isPending} palette={palette} />
			)}
		</View>
	);
}
