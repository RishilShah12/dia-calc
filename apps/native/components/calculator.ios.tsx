import {
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	maxDecimalsFor,
} from "@dia-calc/calc/keypad";
import {
	backFromNet,
	compareQuotes,
	lookupPrice,
	type PriceGrid,
	quote,
	usd,
} from "@dia-calc/calc/rap-calc";
import { findShape, SHAPES } from "@dia-calc/calc/shapes";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	BLOCK_GAP,
	CARD_PADDING,
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
	perCaratFromTotal,
	pricedBy,
	rounded,
	SCREEN_PADDING,
	Subtext,
	s,
	Wheel,
} from "@/components/calc-kit";
import { ACCENT, paletteFor } from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";
import { useGuides } from "@/lib/guides";
import { orpc, queryClient } from "@/utils/orpc";

const signed = (value: number, format: (n: number) => string) =>
	`${value >= 0 ? "+" : "−"}${format(Math.abs(value))}`;

/** Everything the summary card shows, already formatted for display. */
interface Readout {
	backPct: number;
	backText: string;
	backWas: string;
	caratText: string;
	caratWas: string;
	/** Per-carat list of whichever stone is showing — the base, or the recut. */
	listPerCarat: number;
	listText: string;
	listWas: string;
	netPerCarat: number;
	/** Plain digits, e.g. "4050" — what the keypad edits. */
	netRaw: string;
	/** Formatted for display, e.g. "$4,050". */
	netText: string;
	netWas: string;
	total: number;
	/** Plain digits, as `netRaw` is for the per-carat price. */
	totalRaw: string;
	totalText: string;
	totalWas: string;
}

export function Calculator() {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const navigation = useNavigation();
	const { data: session } = authClient.useSession();

	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: 60 * 60 * 1000,
		})
	);

	const refresh = useMutation({
		mutationFn: () => orpc.priceList.get.call({ force: true }),
		onSuccess: (grids) => {
			queryClient.setQueryData(
				orpc.priceList.get.queryOptions({ input: { force: false } }).queryKey,
				grids
			);
		},
	});

	const [shapeName, setShapeName] = useState("Round");
	const [caratText, setCaratText] = useState("1.00");
	const [color, setColor] = useState("g");
	const [clarity, setClarity] = useState("vs1");
	const [backText, setBackText] = useState("-25");
	const [netText, setNetText] = useState("");
	const [totalText, setTotalText] = useState("");
	const [lastEdited, setLastEdited] = useState<"back" | "net" | "total">(
		"back"
	);
	const [target, setTarget] = useState<KeypadTarget>("carat");
	const [profileOpen, setProfileOpen] = useState(false);
	const guides = useGuides();

	// The recut ("after") stone. Seeded from the base stone when the mode is
	// switched on — deliberately not in a useState initialiser, which is how the
	// original web panel ended up comparing against a grade captured at mount.
	const [recut, setRecut] = useState(false);
	const [recutCaratText, setRecutCaratText] = useState("");
	const [recutColor, setRecutColor] = useState("g");
	const [recutClarity, setRecutClarity] = useState("vs1");
	const [recutBackText, setRecutBackText] = useState("-25");

	const shape = findShape(shapeName);
	const grid = priceList.data?.find((entry) => entry.shape === shape.list);

	// Grades are per-list, so switching to a list that doesn't publish the
	// current colour or clarity snaps back to its first valid grade. The recut
	// grades go through the same clamp or a shape switch can strand them outside
	// the grid, which reads as "no price" for a stone that is merely stale.
	useEffect(() => {
		if (!grid) {
			return;
		}
		const [firstColor] = grid.colors;
		const [firstClarity] = grid.clarities;
		if (firstColor) {
			if (!grid.colors.includes(color)) {
				setColor(firstColor);
			}
			if (!grid.colors.includes(recutColor)) {
				setRecutColor(firstColor);
			}
		}
		if (firstClarity) {
			if (!grid.clarities.includes(clarity)) {
				setClarity(firstClarity);
			}
			if (!grid.clarities.includes(recutClarity)) {
				setRecutClarity(firstClarity);
			}
		}
	}, [grid, color, clarity, recutColor, recutClarity]);

	const readout = buildReadout({
		backText,
		caratText,
		clarity,
		color,
		grid,
		lastEdited,
		netText,
		recut,
		recutBackText,
		recutCaratText,
		recutClarity,
		recutColor,
		totalText,
	});

	// While recut is on, the wheels, keypad and slider all drive the after-stone.
	const activeCaratText = recut ? recutCaratText : caratText;
	const activeCarat = Number.parseFloat(activeCaratText) || 0;
	const activeText = (() => {
		if (target === "carat") {
			return activeCaratText;
		}
		return target === "total" ? readout.totalRaw : readout.netRaw;
	})();

	const applyToActive = useCallback(
		(next: string) => {
			if (target === "carat") {
				(recut ? setRecutCaratText : setCaratText)(next);
				return;
			}
			// A typed total is just a per-carat price the dealer hasn't divided
			// yet, so both edit targets converge here before pricing.
			const typed = Number.parseFloat(next) || 0;
			const perCarat =
				target === "total" ? perCaratFromTotal(typed, activeCarat) : typed;
			if (recut) {
				// The recut stone is defined by its back %, so a typed price is
				// stored as the back it implies. Without this, editing PRICE / CT
				// while recut is on would silently retune the *base* stone.
				setRecutBackText(String(backFromNet(readout.listPerCarat, perCarat)));
				return;
			}
			if (target === "total") {
				setLastEdited("total");
				setTotalText(next);
				return;
			}
			setLastEdited("net");
			setNetText(next);
		},
		[activeCarat, readout.listPerCarat, recut, target]
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
			const value = String(Math.round(next));
			if (recut) {
				setRecutBackText(value);
				return;
			}
			setLastEdited("back");
			setBackText(value);
		},
		[recut]
	);

	/**
	 * Switching target freezes what is on screen into that field's buffer
	 * first, so editing continues from the displayed value rather than from a
	 * buffer left behind by an earlier edit.
	 */
	const selectTarget = useCallback(
		(next: KeypadTarget) => {
			if (next === "net") {
				setLastEdited("net");
				setNetText(readout.netPerCarat.toFixed(0));
			}
			if (next === "total") {
				setLastEdited("total");
				setTotalText(readout.total.toFixed(0));
			}
			setTarget(next);
		},
		[readout.netPerCarat, readout.total]
	);
	const selectCarat = useCallback(() => selectTarget("carat"), [selectTarget]);
	const selectNet = useCallback(() => selectTarget("net"), [selectTarget]);
	const selectTotal = useCallback(() => selectTarget("total"), [selectTarget]);

	const toggleRecut = useCallback(() => {
		setRecut((on) => {
			if (!on) {
				// Seed the after-stone from whatever the base stone is right now.
				setRecutCaratText(caratText);
				setRecutColor(color);
				setRecutClarity(clarity);
				setRecutBackText(String(readout.backPct));
				setTarget("carat");
			}
			return !on;
		});
	}, [caratText, clarity, color, readout.backPct]);

	const openDrawer = useCallback(() => {
		navigation.dispatch({ type: "OPEN_DRAWER" });
	}, [navigation]);
	const openProfile = useCallback(() => setProfileOpen(true), []);
	const handleRefresh = useCallback(() => refresh.mutate(), [refresh]);
	const handleSignOut = useCallback(async () => {
		setProfileOpen(false);
		await authClient.signOut();
		queryClient.clear();
	}, []);

	const wheelWidth = (width - SCREEN_PADDING * 2) / 3;
	const sliderValue = Math.min(MAX_BACK, Math.max(MIN_BACK, readout.backPct));
	const wheelColor = recut ? recutColor : color;
	const wheelClarity = recut ? recutClarity : clarity;
	const failed = !(grid || priceList.isPending);
	// All three wheels share one caption colour; recut is a property of the
	// stone being priced, not of one wheel.
	const captionColor = recut ? ACCENT : palette.label;
	const wheelLabel = (text: string) => (guides ? text : null);

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
						bottom: insets.bottom + BLOCK_GAP,
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

				<VStack
					alignment="leading"
					modifiers={[
						padding({ all: CARD_PADDING }),
						frame({ maxHeight: FILL, maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(10)}
				>
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
									rounded(44, "bold"),
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
							<Subtext color={palette.subtle}>{readout.caratWas}</Subtext>
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
									rounded(34, "bold"),
									foregroundStyle(ACCENT),
									monospacedDigit(),
									contentTransition("numericText"),
									animation(Animation.default, readout.total),
								]}
							>
								{readout.totalText}
							</Text>
							<Subtext color={palette.subtle}>{readout.totalWas}</Subtext>
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
							onTap={selectNet}
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
				    are one card — a divider separates them, not a gap. */}
				<VStack
					modifiers={[
						padding({ vertical: s(12) }),
						frame({ maxHeight: FILL, maxWidth: FILL }),
						GLASS_CARD,
					]}
					spacing={s(8)}
				>
					<HStack spacing={0}>
						<Wheel
							label={wheelLabel("SHAPE")}
							labelColor={captionColor}
							onChange={setShapeName}
							options={SHAPES.map((item) => ({
								title: item.abbr,
								value: item.name,
							}))}
							selection={shapeName}
							width={wheelWidth}
						/>
						<Wheel
							label={wheelLabel("COLOR")}
							labelColor={captionColor}
							onChange={recut ? setRecutColor : setColor}
							options={(grid?.colors ?? []).map((c) => ({
								title: c.toUpperCase(),
								value: c,
							}))}
							selection={wheelColor}
							width={wheelWidth}
						/>
						<Wheel
							label={wheelLabel("CLARITY")}
							labelColor={captionColor}
							onChange={recut ? setRecutClarity : setClarity}
							options={(grid?.clarities ?? []).map((c) => ({
								title: c.toUpperCase(),
								value: c,
							}))}
							selection={wheelClarity}
							width={wheelWidth}
						/>
					</HStack>

					<Divider />

					<DiscountSlider
						captionColor={captionColor}
						guides={guides}
						onChange={handleDiscount}
						palette={palette}
						value={sliderValue}
					/>
				</VStack>

				<Keypad
					actionKey={
						<Key
							active={recut}
							label="RECUT"
							onPress={toggleRecut}
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

/**
 * Prices the stone, and in recut mode prices the after-stone too, returning
 * every string the card renders. Split out of the component because it is pure
 * and because it is the only place the before/after pairing is decided.
 */
function buildReadout(input: {
	backText: string;
	caratText: string;
	clarity: string;
	color: string;
	grid: PriceGrid | undefined;
	lastEdited: "back" | "net" | "total";
	netText: string;
	recut: boolean;
	recutBackText: string;
	recutCaratText: string;
	recutClarity: string;
	recutColor: string;
	totalText: string;
}): Readout {
	const { grid, recut } = input;
	const noPrice = {
		bracket: null,
		bracketIndex: -1,
		clamped: null,
		perCarat: null,
	};

	const baseCarat = Number.parseFloat(input.caratText) || 0;
	const baseFound = grid
		? lookupPrice(grid, baseCarat, input.color, input.clarity)
		: noPrice;
	const baseList = baseFound.perCarat ?? 0;
	const base = quote(baseList, baseCarat, pricedBy(input, baseCarat));

	const money = (value: number, hasPrice: boolean) =>
		grid && hasPrice ? usd(value) : EMPTY;
	const pct = (value: number) => (grid ? `${value.toFixed(0)}%` : EMPTY);

	if (!recut) {
		// The typed field keeps its raw buffer, so a half-typed "-2" is not
		// rewritten under the dealer's thumb; the derived ones are recomputed.
		const netText =
			input.lastEdited === "net"
				? input.netText
				: (base.netPerCarat || 0).toFixed(0);
		const totalRaw =
			input.lastEdited === "total"
				? input.totalText
				: (base.total || 0).toFixed(0);
		return {
			backPct: base.backPct,
			backText: pct(base.backPct),
			backWas: "",
			caratText: input.caratText || "0",
			caratWas: "",
			listPerCarat: baseList,
			listText: money(baseList, baseFound.perCarat !== null),
			listWas: "",
			netPerCarat: base.netPerCarat,
			netRaw: netText,
			netText: money(base.netPerCarat, baseFound.perCarat !== null),
			netWas: "",
			total: base.total,
			totalRaw,
			totalText: money(base.total, baseFound.perCarat !== null),
			totalWas: "",
		};
	}

	const afterCarat = Number.parseFloat(input.recutCaratText) || 0;
	const afterFound = grid
		? lookupPrice(grid, afterCarat, input.recutColor, input.recutClarity)
		: noPrice;
	const afterList = afterFound.perCarat ?? 0;
	const afterBack = Number.parseFloat(input.recutBackText) || 0;
	const after = quote(afterList, afterCarat, { backPct: afterBack });
	const { delta, deltaPct, yieldPct } = compareQuotes(
		base,
		after,
		baseCarat,
		afterCarat
	);
	const priced = afterFound.perCarat !== null;

	return {
		backPct: after.backPct,
		backText: pct(after.backPct),
		backWas: `was ${pct(base.backPct)}`,
		caratText: input.recutCaratText || "0",
		caratWas: `was ${input.caratText} · ${yieldPct.toFixed(0)}% yield`,
		listPerCarat: afterList,
		listText: money(afterList, priced),
		listWas: `was ${money(baseList, baseFound.perCarat !== null)}`,
		netPerCarat: after.netPerCarat,
		netRaw: (after.netPerCarat || 0).toFixed(0),
		netText: money(after.netPerCarat, priced),
		netWas: `was ${money(base.netPerCarat, baseFound.perCarat !== null)}`,
		total: after.total,
		totalRaw: (after.total || 0).toFixed(0),
		totalText: money(after.total, priced),
		totalWas: priced
			? `${signed(deltaPct, (n) => `${n.toFixed(1)}%`)} · ${signed(delta, usd)}`
			: "no price for that grade",
	};
}
