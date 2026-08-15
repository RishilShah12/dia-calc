import { formatBracket, type PriceGrid, usd } from "@dia-calc/calc/rap-calc";
import { listLabel, RAP_LISTS } from "@dia-calc/calc/shapes";
import { Host, Picker, Text as SwiftText, VStack } from "@expo/ui/swift-ui";
import { frame, padding, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	BLOCK_GAP,
	CARD_PADDING,
	EMPTY,
	FILL,
	GLASS_CARD,
	rounded,
	SCREEN_PADDING,
	s,
	Wheel,
} from "@/components/calc-kit";
import { ProfileSheet } from "@/components/calc-profile";
import {
	ACCENT,
	type CalcPalette,
	ON_ACCENT,
	paletteFor,
} from "@/components/calc-theme";
import { useGuides } from "@/lib/guides";
import { orpc } from "@/utils/orpc";

/**
 * The price list itself, rather than the one cell of it a graded stone lands
 * on. A dealer quoting over the phone reads across a row — "G is 12,200, H is
 * 11,000" — which the calculator cannot answer without re-spinning two wheels.
 *
 * The table is React Native where the rest of the app is SwiftUI, and that is
 * deliberate: whole prices need more width than a phone has, so the grid has to
 * scroll both ways with its heading row and colour column pinned. `@expo/ui`
 * exposes neither SwiftUI's pinned section headers nor any way to share a
 * scroll offset between two scroll views, so there is nothing to build that on.
 * React Native drives the pinned strips from the body's own scroll position on
 * the UI thread, which is what the two `Animated.Value`s below are for.
 *
 * The controls above it stay SwiftUI, in a self-sizing `Host`: the wheel and
 * the segmented picker are the same native controls the calculators use, and
 * the profile sheet has to sit inside a `Host` to be presented at all.
 */

/** Wide enough for `$250,000`, which the ten-carat brackets reach. */
const CELL_W = s(92);
const ROW_H = s(46);
const HEAD_H = s(44);
/** A colour letter and the rule beside it. */
const LABEL_W = s(46);
/** The glass cards' own radius, so the table reads as part of the same set. */
const TABLE_RADIUS = 28;

/** The row and column a tapped cell belongs to, so the eye can follow both. */
const CROSS_TINT = `${ACCENT}1F`;
/**
 * iOS's rounded system face, which every SwiftUI surface in this app asks for
 * by name. React Native has no token for it, and an unknown family falls back
 * to the plain system font rather than failing.
 */
const ROUNDED = ".AppleSystemUIFontRounded";

/** Structurally `RapList` from `shapes`, spelled out to leave that name free. */
type ListName = (typeof RAP_LISTS)[number];

interface Picked {
	clarity: string;
	color: string;
}

const styles = StyleSheet.create({
	caption: {
		fontFamily: ROUNDED,
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
		fontFamily: ROUNDED,
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
		fontFamily: ROUNDED,
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
		fontFamily: ROUNDED,
		fontSize: 15,
		fontWeight: "700",
	},
	/** Clips the pinned strips, which run wider and taller than what shows. */
	pinned: { overflow: "hidden" },
	readout: {
		fontFamily: ROUNDED,
		fontSize: 13,
		fontVariant: ["tabular-nums"],
		fontWeight: "600",
	},
	row: { flexDirection: "row" },
	table: {
		borderRadius: TABLE_RADIUS,
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

function PriceTable({
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

export function RapList() {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const guides = useGuides();

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: 60 * 60 * 1000,
		})
	);

	const [list, setList] = useState<ListName>("Round");
	const [bracketIndex, setBracketIndex] = useState(0);
	const [picked, setPicked] = useState<Picked | null>(null);

	const grid: PriceGrid | undefined = priceList.data?.find(
		(entry) => entry.shape === list
	);
	const brackets = grid?.brackets ?? [];

	// Pear publishes fewer brackets than Round, so a switch can strand the
	// selection past the end of the new list.
	useEffect(() => {
		if (brackets.length && bracketIndex >= brackets.length) {
			setBracketIndex(brackets.length - 1);
		}
	}, [brackets.length, bracketIndex]);

	const handleList = useCallback((next: string) => {
		setList(next as ListName);
		setPicked(null);
	}, []);
	const handleBracket = useCallback((next: string) => {
		setBracketIndex(Number.parseInt(next, 10));
		setPicked(null);
	}, []);

	const safeIndex = Math.min(bracketIndex, Math.max(brackets.length - 1, 0));
	const prices = grid?.prices[safeIndex] ?? [];
	const pickedPrice =
		picked && grid
			? (prices[grid.colors.indexOf(picked.color)]?.[
					grid.clarities.indexOf(picked.clarity)
				] ?? null)
			: null;

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
			{/* Which list, and which size in it — the two questions that have to be
			    answered before a row of prices means anything. */}
			<Host
				colorScheme={scheme}
				matchContents={{ vertical: true }}
				seedColor={ACCENT}
				style={{ marginTop: BLOCK_GAP }}
			>
				<VStack spacing={0}>
					<ProfileSheet />
					<VStack
						modifiers={[
							padding({ all: CARD_PADDING }),
							frame({ maxWidth: FILL }),
							GLASS_CARD,
						]}
						spacing={s(8)}
					>
						<Picker
							modifiers={[pickerStyle("segmented"), frame({ maxWidth: FILL })]}
							onSelectionChange={handleList}
							selection={list}
						>
							{RAP_LISTS.map((entry) => (
								<SwiftText
									key={entry}
									modifiers={[tag(entry), rounded(13, "semibold")]}
								>
									{listLabel(entry)}
								</SwiftText>
							))}
						</Picker>
						<Wheel
							height={s(84)}
							label={guides ? "SIZE" : null}
							labelColor={palette.label}
							onChange={handleBracket}
							options={brackets.map((bracket, index) => ({
								title: formatBracket(bracket),
								value: String(index),
							}))}
							selection={String(safeIndex)}
							width={width - SCREEN_PADDING * 2 - CARD_PADDING * 2}
						/>
					</VStack>
				</VStack>
			</Host>

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

			{grid ? (
				<PriceTable
					clarities={grid.clarities}
					colors={grid.colors}
					onPick={setPicked}
					palette={palette}
					picked={picked}
					prices={prices}
				/>
			) : (
				<Text style={[styles.cellText, { color: palette.subtle }]}>
					{priceList.isPending ? "Loading the list…" : "No list on device"}
				</Text>
			)}
		</View>
	);
}
