import { type Picked, useRapList as useRapListState } from "@dia-calc/calc/rap";
import { EMPTY, usd } from "@dia-calc/calc/rap-calc";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import {
	Animated,
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";

import { CARD_RADIUS, roundedFamily, s } from "@/components/calc-base";
import {
	ACCENT,
	type CalcPalette,
	ON_ACCENT,
	paletteFor,
	type Scheme,
} from "@/components/calc-theme";
import { orpc } from "@/utils/orpc";

/**
 * The Rapaport grid itself, and the state that picks which page of it to show.
 *
 * The table is plain React Native on both platforms, and that is deliberate:
 * whole prices need more width than a phone has, so the grid has to scroll both
 * ways with its heading row and colour column pinned. Neither `@expo/ui` tree
 * exposes pinned section headers or a way to share a scroll offset between two
 * scroll views, so there is nothing native to build that on. React Native
 * drives the pinned strips from the body's own scroll position on the UI
 * thread, which is what the two `Animated.Value`s below are for — a technique
 * that was never iOS-specific.
 *
 * Only the controls above it differ per platform, so only those live in the
 * `.ios.tsx` / `.android.tsx` screens.
 */

const HOUR = 60 * 60 * 1000;

/** Wide enough for `$250,000`, which the ten-carat brackets reach. */
const CELL_W = s(92);
const ROW_H = s(46);
const HEAD_H = s(44);
/** A colour letter and the rule beside it. */
const LABEL_W = s(46);

/** The row and column a tapped cell belongs to, so the eye can follow both. */
const CROSS_TINT = `${ACCENT}1F`;

const styles = StyleSheet.create({
	caption: {
		fontFamily: roundedFamily("semibold"),
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.6,
	},
	captionRow: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: s(6),
		paddingVertical: s(8),
	},
	cell: {
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderRightWidth: StyleSheet.hairlineWidth,
		height: ROW_H,
		justifyContent: "center",
		width: CELL_W,
	},
	cellText: {
		fontFamily: roundedFamily("medium"),
		fontSize: 15,
		fontVariant: ["tabular-nums"],
		fontWeight: "500",
	},
	corner: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderRightWidth: StyleSheet.hairlineWidth,
		height: HEAD_H,
		width: LABEL_W,
	},
	fill: { flex: 1 },
	headCell: {
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderRightWidth: StyleSheet.hairlineWidth,
		height: HEAD_H,
		justifyContent: "center",
		width: CELL_W,
	},
	headText: {
		fontFamily: roundedFamily("semibold"),
		fontSize: 15,
		fontWeight: "600",
	},
	labelCell: {
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderRightWidth: StyleSheet.hairlineWidth,
		height: ROW_H,
		justifyContent: "center",
		width: LABEL_W,
	},
	labelText: {
		fontFamily: roundedFamily("bold"),
		fontSize: 15,
		fontWeight: "700",
	},
	/** Clips the pinned strips, which run wider and taller than what shows. */
	pinned: { overflow: "hidden" },
	readout: {
		fontFamily: roundedFamily("semibold"),
		fontSize: 13,
		fontVariant: ["tabular-nums"],
		fontWeight: "600",
	},
	row: { flexDirection: "row" },
	table: {
		borderRadius: CARD_RADIUS,
		borderWidth: StyleSheet.hairlineWidth,
		flex: 1,
		overflow: "hidden",
	},
	tableBody: { flex: 1, flexDirection: "row" },
});

/** Solid where the row and the column cross, tinted along both of them. */
function cellTint(onRow: boolean, onColumn: boolean): string | undefined {
	if (onRow && onColumn) {
		return ACCENT;
	}
	return onRow || onColumn ? CROSS_TINT : undefined;
}

/**
 * Takes the grade rather than a handler so the tap closure is built here, once
 * per cell, instead of freshly on every render of the whole table.
 */
function Cell({
	clarity,
	color,
	onPick,
	palette,
	price,
	tint,
}: {
	clarity: string;
	color: string;
	onPick: (next: Picked) => void;
	palette: CalcPalette;
	price: number | null;
	tint: string | undefined;
}) {
	const handlePress = useCallback(
		() => onPick({ clarity, color }),
		[clarity, color, onPick]
	);
	const struck = tint === ACCENT;
	return (
		<Pressable
			onPress={handlePress}
			style={[
				styles.cell,
				{ backgroundColor: tint, borderColor: palette.hairline },
			]}
		>
			<Text
				style={[
					styles.cellText,
					{
						color: struck ? ON_ACCENT : palette.primary,
						fontWeight: struck ? "700" : "500",
					},
				]}
			>
				{price === null ? EMPTY : usd(price)}
			</Text>
		</Pressable>
	);
}

export function PriceTable({
	clarities,
	colors,
	onPick,
	palette,
	picked,
	prices,
}: {
	clarities: string[];
	colors: string[];
	onPick: (next: Picked) => void;
	palette: CalcPalette;
	picked: Picked | null;
	prices: (number | null)[][];
}) {
	// The pinned heading and colour strip are not scroll views of their own —
	// they are plain rows shifted by the body's offset, so they track it on the
	// UI thread rather than chasing it a frame late from JavaScript.
	const scrollX = useRef(new Animated.Value(0)).current;
	const scrollY = useRef(new Animated.Value(0)).current;
	const shiftX = useMemo(
		() => ({ transform: [{ translateX: Animated.multiply(scrollX, -1) }] }),
		[scrollX]
	);
	const shiftY = useMemo(
		() => ({ transform: [{ translateY: Animated.multiply(scrollY, -1) }] }),
		[scrollY]
	);
	const onScrollY = useMemo(
		() =>
			Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
				useNativeDriver: true,
			}),
		[scrollY]
	);
	const onScrollX = useMemo(
		() =>
			Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
				useNativeDriver: true,
			}),
		[scrollX]
	);

	const rule = { borderColor: palette.hairline };

	return (
		<View
			style={[
				styles.table,
				{ backgroundColor: palette.surface, borderColor: palette.hairline },
			]}
		>
			<View style={styles.row}>
				<View style={[styles.corner, rule]} />
				<View style={[styles.pinned, styles.fill]}>
					<Animated.View style={[styles.row, shiftX]}>
						{clarities.map((clarity) => (
							<View
								key={clarity}
								style={[
									styles.headCell,
									rule,
									picked?.clarity === clarity && {
										backgroundColor: CROSS_TINT,
									},
								]}
							>
								<Text style={[styles.headText, { color: palette.label }]}>
									{clarity.toUpperCase()}
								</Text>
							</View>
						))}
					</Animated.View>
				</View>
			</View>

			<View style={styles.tableBody}>
				<View style={[styles.pinned, { width: LABEL_W }]}>
					<Animated.View style={shiftY}>
						{colors.map((color) => (
							<View
								key={color}
								style={[
									styles.labelCell,
									rule,
									picked?.color === color && { backgroundColor: CROSS_TINT },
								]}
							>
								<Text style={[styles.labelText, { color: palette.primary }]}>
									{color.toUpperCase()}
								</Text>
							</View>
						))}
					</Animated.View>
				</View>

				<Animated.ScrollView
					onScroll={onScrollY}
					scrollEventThrottle={16}
					showsVerticalScrollIndicator={false}
				>
					<Animated.ScrollView
						horizontal
						onScroll={onScrollX}
						scrollEventThrottle={16}
						showsHorizontalScrollIndicator={false}
					>
						<View>
							{colors.map((color, colorIndex) => (
								<View key={color} style={styles.row}>
									{clarities.map((clarity, clarityIndex) => (
										<Cell
											clarity={clarity}
											color={color}
											key={clarity}
											onPick={onPick}
											palette={palette}
											price={prices[colorIndex]?.[clarityIndex] ?? null}
											tint={cellTint(
												picked?.color === color,
												picked?.clarity === clarity
											)}
										/>
									))}
								</View>
							))}
						</View>
					</Animated.ScrollView>
				</Animated.ScrollView>
			</View>
		</View>
	);
}

/**
 * The caption over the table: what the numbers are, and which one is picked.
 * Plain React Native for the same reason the table is.
 */
export function PriceCaption({
	palette,
	picked,
	pickedPrice,
}: {
	palette: CalcPalette;
	picked: Picked | null;
	pickedPrice: number | null;
}) {
	return (
		<View style={styles.captionRow}>
			<Text style={[styles.caption, { color: palette.label }]}>
				PRICE PER CARAT
			</Text>
			{picked ? (
				<Text style={[styles.readout, { color: ACCENT }]}>
					{`${picked.color.toUpperCase()} ${picked.clarity.toUpperCase()} · ${
						pickedPrice === null ? EMPTY : usd(pickedPrice)
					}`}
				</Text>
			) : (
				<Text style={[styles.caption, { color: palette.subtle }]}>
					TAP A CELL
				</Text>
			)}
		</View>
	);
}

/** The empty and loading states, so both screens say the same thing. */
export function PriceTablePlaceholder({
	isPending,
	palette,
}: {
	isPending: boolean;
	palette: CalcPalette;
}) {
	return (
		<Text style={[styles.cellText, { color: palette.subtle }]}>
			{isPending ? "Loading the list…" : "No list on device"}
		</Text>
	);
}

/**
 * The state behind the table lives in `@dia-calc/calc` so the web screen reads
 * the same one; what stays here is the query and the palette, as on the two
 * calculator screens.
 */
export function useRapList() {
	const scheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: HOUR,
		})
	);

	return {
		...useRapListState(priceList.data),
		isPending: priceList.isPending,
		palette,
		scheme,
	};
}
