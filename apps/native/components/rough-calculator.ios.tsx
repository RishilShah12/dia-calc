import {
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	maxDecimalsFor,
} from "@dia-calc/calc/keypad";
import {
	lookupPrice,
	type PriceGrid,
	quote,
	type RoughSummary,
	summarizeRough,
	usd,
} from "@dia-calc/calc/rap-calc";
import { findShape, SHAPES } from "@dia-calc/calc/shapes";
import {
	BottomSheet,
	Button,
	Divider,
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
	monospacedDigit,
	onTapGesture,
	padding,
	pickerStyle,
	presentationDetents,
	presentationDragIndicator,
	tag,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	BLOCK_GAP,
	Caption,
	DiscountSlider,
	EMPTY,
	FILL,
	GLASS_CARD,
	Header,
	Key,
	Keypad,
	MAX_BACK,
	Metric,
	MIN_BACK,
	ProfileSheet,
	pricedBy,
	RoundGlassButton,
	rounded,
	SCREEN_PADDING,
	Subtext,
	s,
	Wheel,
} from "@/components/calc-kit";
import { ACCENT, type CalcPalette, paletteFor } from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";
import { useGuides } from "@/lib/guides";
import { orpc, queryClient } from "@/utils/orpc";

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
const ROUGH_WHEEL_HEIGHT = s(78);
const ROUGH_VALUE = 30;
const PART_CARAT = 32;
const PART_TOTAL = 27;

/** One planned part. Same fields the polish screen keeps for a single stone. */
interface Part {
	backText: string;
	caratText: string;
	clarity: string;
	color: string;
	lastEdited: "back" | "net" | "total";
	netText: string;
	shapeName: string;
	totalText: string;
}

const blankPart = (): Part => ({
	backText: "-25",
	caratText: "",
	clarity: "vs1",
	color: "g",
	lastEdited: "back",
	netText: "",
	shapeName: "Round",
	totalText: "",
});

/**
 * ponytail: A-Z only — a 27th part would label itself "[". Nobody plans 27
 * parts off one rough on a phone; switch to numbers if anyone ever does.
 */
const partLabel = (index: number) => String.fromCharCode(65 + index);

const gridFor = (part: Part, grids: PriceGrid[] | undefined) =>
	grids?.find((entry) => entry.shape === findShape(part.shapeName).list);

interface PartQuote {
	backPct: number;
	carat: number;
	listPerCarat: number;
	netPerCarat: number;
	/** False for an unpublished grade, so the card shows a dash, not $0. */
	priced: boolean;
	total: number;
}

/** Prices one part as its own stone. Pure, so the sheet and the card agree. */
function quotePart(part: Part, grids: PriceGrid[] | undefined): PartQuote {
	const carat = Number.parseFloat(part.caratText) || 0;
	const grid = gridFor(part, grids);
	const found = grid
		? lookupPrice(grid, carat, part.color, part.clarity)
		: null;
	const listPerCarat = found?.perCarat ?? null;
	return {
		priced: listPerCarat !== null,
		...quote(listPerCarat ?? 0, carat, pricedBy(part, carat)),
		carat,
	};
}

/**
 * Grades are per-list, so a part on a list that doesn't publish its colour or
 * clarity snaps back to that list's first valid grade. Returns the part
 * untouched when nothing moved, which is what lets the caller skip the setState.
 */
function clampPart(part: Part, grids: PriceGrid[] | undefined): Part {
	const grid = gridFor(part, grids);
	if (!grid) {
		return part;
	}
	const [firstColor] = grid.colors;
	const [firstClarity] = grid.clarities;
	const color = grid.colors.includes(part.color)
		? part.color
		: (firstColor ?? part.color);
	const clarity = grid.clarities.includes(part.clarity)
		? part.clarity
		: (firstClarity ?? part.clarity);
	return color === part.color && clarity === part.clarity
		? part
		: { ...part, clarity, color };
}

const money = (value: number, priced: boolean) => (priced ? usd(value) : EMPTY);
const pct = (value: number, priced: boolean) =>
	priced ? `${value.toFixed(0)}%` : EMPTY;

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
			modifiers={[onTapGesture(handleSelect), padding({ vertical: 4 })]}
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
			modifiers={[tint("#D9544D")]}
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
			modifiers={[
				presentationDetents(["medium", "large"]),
				presentationDragIndicator("visible"),
			]}
			onIsPresentedChange={onIsPresentedChange}
		>
			<VStack modifiers={[frame({ width })]} spacing={0}>
				{/* `List` scrolls on its own, so a rough cut into a dozen parts needs
				    no extra plumbing here. */}
				<List>
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
							<SwipeActions key={partLabel(index)}>
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
						value={`${summary.partsCarat.toFixed(2)} ct · ${summary.yieldPct.toFixed(0)}% yield`}
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
		</BottomSheet>
	);
}

export function RoughCalculator() {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const navigation = useNavigation();
	const { data: session } = authClient.useSession();
	const guides = useGuides();

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: 60 * 60 * 1000,
		})
	);

	const refresh = useMutation({
		mutationFn: () => orpc.priceList.get.call({ force: true }),
		onSuccess: (fetched) => {
			queryClient.setQueryData(
				orpc.priceList.get.queryOptions({ input: { force: false } }).queryKey,
				fetched
			);
		},
	});

	const [roughText, setRoughText] = useState("");
	const [parts, setParts] = useState<Part[]>(() => [blankPart()]);
	const [active, setActive] = useState(0);
	const [target, setTarget] = useState<KeypadTarget>("rough");
	const [partsOpen, setPartsOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	const grids = priceList.data;

	// The grid arrives after mount, so the seeded grades only become checkable
	// here. Returning `prev` unchanged is what stops this looping.
	useEffect(() => {
		if (!grids) {
			return;
		}
		setParts((prev) => {
			const next = prev.map((part) => clampPart(part, grids));
			return next.some((part, index) => part !== prev[index]) ? next : prev;
		});
	}, [grids]);

	const updateActive = useCallback(
		(patch: Partial<Part>) => {
			setParts((prev) =>
				prev.map((part, index) =>
					index === active ? { ...part, ...patch } : part
				)
			);
		},
		[active]
	);

	const roughCarat = Number.parseFloat(roughText) || 0;
	const activePart = parts[active] ?? blankPart();
	const activeQuote = quotePart(activePart, grids);
	const quotes = parts.map((part) => quotePart(part, grids));
	const summary = summarizeRough(roughCarat, quotes);
	const grid = gridFor(activePart, grids);

	// The typed field keeps its raw buffer, so a half-typed "-2" is not
	// rewritten under the dealer's thumb; the derived one is recomputed.
	const netRaw =
		activePart.lastEdited === "net"
			? activePart.netText
			: (activeQuote.netPerCarat || 0).toFixed(0);
	const totalRaw =
		activePart.lastEdited === "total"
			? activePart.totalText
			: (activeQuote.total || 0).toFixed(0);

	const activeText = (() => {
		if (target === "rough") {
			return roughText;
		}
		if (target === "carat") {
			return activePart.caratText;
		}
		return target === "total" ? totalRaw : netRaw;
	})();

	const applyToActive = useCallback(
		(next: string) => {
			if (target === "rough") {
				setRoughText(next);
				return;
			}
			if (target === "carat") {
				updateActive({ caratText: next });
				return;
			}
			// A typed total is just a per-carat price the dealer hasn't divided
			// yet; `pricedBy` does that division when the part is quoted.
			if (target === "total") {
				updateActive({ lastEdited: "total", totalText: next });
				return;
			}
			updateActive({ lastEdited: "net", netText: next });
		},
		[target, updateActive]
	);

	const handleDigit = useCallback(
		(digit: string) => {
			applyToActive(keypadDigit(activeText, digit, maxDecimalsFor(target)));
		},
		[activeText, applyToActive, target]
	);
	const handleDot = useCallback(() => {
		applyToActive(keypadDot(activeText, maxDecimalsFor(target)));
	}, [activeText, applyToActive, target]);
	const handleBackspace = useCallback(() => {
		applyToActive(keypadBackspace(activeText));
	}, [activeText, applyToActive]);
	const handleClear = useCallback(() => applyToActive(""), [applyToActive]);

	const handleDiscount = useCallback(
		(next: number) => {
			updateActive({ backText: String(Math.round(next)), lastEdited: "back" });
		},
		[updateActive]
	);

	/**
	 * Switching target freezes what is on screen into that field's buffer first,
	 * so editing continues from the displayed value rather than from a buffer
	 * left behind by an earlier edit.
	 */
	const selectTarget = useCallback(
		(next: KeypadTarget) => {
			if (next === "net") {
				updateActive({
					lastEdited: "net",
					netText: activeQuote.netPerCarat.toFixed(0),
				});
			}
			if (next === "total") {
				updateActive({
					lastEdited: "total",
					totalText: activeQuote.total.toFixed(0),
				});
			}
			setTarget(next);
		},
		[activeQuote.netPerCarat, activeQuote.total, updateActive]
	);
	const selectRough = useCallback(() => setTarget("rough"), []);
	const selectCarat = useCallback(() => selectTarget("carat"), [selectTarget]);
	const selectNet = useCallback(() => selectTarget("net"), [selectTarget]);
	const selectTotal = useCallback(() => selectTarget("total"), [selectTarget]);

	const selectPart = useCallback((next: string) => {
		setActive(Number(next));
	}, []);

	const addPart = useCallback(() => {
		// Grades carry over — a rough usually yields similar goods — but the
		// weight does not: a copied weight silently doubles the rough's total.
		setParts((prev) => {
			const source = prev[active] ?? blankPart();
			return [
				...prev,
				{
					...source,
					caratText: "",
					lastEdited: "back" as const,
					netText: "",
					totalText: "",
				},
			];
		});
		setActive(parts.length);
		setTarget("carat");
	}, [active, parts.length]);

	const deletePart = useCallback((index: number) => {
		setParts((prev) =>
			prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
		);
		// Anything at or after the hole shifts down one; the selection follows it.
		setActive((current) =>
			current < index ? current : Math.max(0, current - 1)
		);
	}, []);

	const selectPartFromSheet = useCallback((index: number) => {
		setActive(index);
		setPartsOpen(false);
	}, []);

	const handleShape = useCallback(
		(shapeName: string) => {
			setParts((prev) =>
				prev.map((part, index) =>
					index === active ? clampPart({ ...part, shapeName }, grids) : part
				)
			);
		},
		[active, grids]
	);
	const handleColor = useCallback(
		(color: string) => updateActive({ color }),
		[updateActive]
	);
	const handleClarity = useCallback(
		(clarity: string) => updateActive({ clarity }),
		[updateActive]
	);

	const openDrawer = useCallback(() => {
		navigation.dispatch({ type: "OPEN_DRAWER" });
	}, [navigation]);
	const openProfile = useCallback(() => setProfileOpen(true), []);
	const openParts = useCallback(() => setPartsOpen(true), []);
	const handleRefresh = useCallback(() => refresh.mutate(), [refresh]);
	const handleSignOut = useCallback(async () => {
		setProfileOpen(false);
		await authClient.signOut();
		queryClient.clear();
	}, []);

	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const sliderValue = Math.min(
		MAX_BACK,
		Math.max(MIN_BACK, activeQuote.backPct)
	);
	const failed = !(grid || priceList.isPending);
	const wheelLabel = (text: string) => (guides ? text : null);
	const partCount = `${parts.length} part${parts.length === 1 ? "" : "s"}`;

	return (
		/* The insets are applied once, as padding below; letting SwiftUI inset the
		   hosting view as well is what left a gap above the header. */
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
						top: insets.top + BLOCK_GAP,
					}),
					frame({ maxHeight: FILL, maxWidth: FILL }),
				]}
				spacing={BLOCK_GAP}
			>
				<Header
					failed={failed}
					listDate={grid?.date}
					onOpenDrawer={openDrawer}
					palette={palette}
					profile={
						<ProfileSheet
							email={session?.user.email ?? ""}
							isPresented={profileOpen}
							name={session?.user.name ?? "Signed in"}
							onIsPresentedChange={setProfileOpen}
							onOpen={openProfile}
							onRefresh={handleRefresh}
							onSignOut={handleSignOut}
							palette={palette}
							refreshing={refresh.isPending}
							width={width}
						/>
					}
				/>

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
						</VStack>
						<Spacer />
						<VStack alignment="trailing" spacing={2}>
							<Caption color={palette.label}>VALUE / CT</Caption>
							<Text
								modifiers={[
									rounded(ROUGH_VALUE, "bold"),
									foregroundStyle(ACCENT),
									monospacedDigit(),
									contentTransition("numericText"),
									animation(Animation.default, summary.perCarat),
								]}
							>
								{usd(summary.perCarat, true)}
							</Text>
						</VStack>
					</HStack>
					<HStack>
						<Subtext color={palette.subtle}>
							{`${partCount} · ${summary.partsCarat.toFixed(2)} ct · ${summary.yieldPct.toFixed(0)}% yield`}
						</Subtext>
						<Spacer />
						<Subtext color={palette.subtle}>
							{`all parts ${usd(summary.total)}`}
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
