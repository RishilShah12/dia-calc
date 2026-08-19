import { formatRapDate } from "@dia-calc/calc/rap-calc";
import {
	BottomSheet,
	Button,
	Group,
	HStack,
	Image,
	List,
	Section,
	Spacer,
	Text,
	VStack,
	ZStack,
} from "@expo/ui/swift-ui";
import {
	buttonStyle,
	foregroundStyle,
	frame,
	listRowBackground,
	listStyle,
	monospacedDigit,
	padding,
	presentationBackground,
	presentationDetents,
	presentationDragIndicator,
	scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";

import { SCREEN_PADDING } from "@/components/calc-base";
import { FILL, RoundGlassButton, rounded } from "@/components/calc-kit";
import { ACCENT, paletteFor, useScheme } from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";
import { setProfileOpen, useProfileOpen } from "@/lib/profile-sheet";
import { orpc, queryClient } from "@/utils/orpc";

/**
 * The account sheet, wired to its own data.
 *
 * Every screen with the toolbar's profile button has to mount one of these
 * inside its own `Host` — the sheet is SwiftUI, the button that opens it is a
 * `UIBarButtonItem`, and the only thing joining them is the module store in
 * `lib/profile-sheet`. Three screens doing that meant three copies of the same
 * session-plus-query-plus-mutation wiring, so it lives here instead and the
 * screens render `<ProfileSheet />` with nothing to pass.
 *
 * Plain filename rather than `.ios.tsx` for the same reason as `calc-kit`: only
 * `.ios.tsx` screens import it, so it never reaches the Android graph.
 */

const DESTRUCTIVE = "#D9544D";

/** A Settings row: tinted glyph, label, and nothing else competing for the eye. */
function SheetRow({
	busy = false,
	label,
	onPress,
	symbol,
	tone,
}: {
	busy?: boolean;
	label: string;
	onPress: () => void;
	symbol: "arrow.clockwise" | "rectangle.portrait.and.arrow.right";
	tone: string;
}) {
	const title = busy ? "Refreshing…" : label;
	return (
		<Button modifiers={[buttonStyle("plain")]} onPress={onPress}>
			<HStack spacing={12}>
				<Image
					color={tone}
					modifiers={[frame({ width: 24 })]}
					size={17}
					systemName={symbol}
				/>
				<Text modifiers={[rounded(16, "medium"), foregroundStyle(tone)]}>
					{title}
				</Text>
				<Spacer />
			</HStack>
		</Button>
	);
}

/**
 * Anchorless: the button that opens this lives in the native toolbar, well
 * outside the SwiftUI tree. `BottomSheet` substitutes a zero-size `Color.clear`
 * when no anchor is given, so the sheet still has to be mounted inside a `Host`
 * — it just no longer needs anything to hang off visually.
 *
 * The presentation modifiers go on the *content*, not on `BottomSheet`. On the
 * sheet element they apply to the anchor-plus-sheet composite, which is outside
 * the presentation context, and are silently ignored.
 */
export function ProfileSheet() {
	const scheme = useScheme();
	const palette = paletteFor(scheme);
	const { width } = useWindowDimensions();
	const isPresented = useProfileOpen();
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

	const close = useCallback(() => setProfileOpen(false), []);
	const handleRefresh = useCallback(() => refresh.mutate(), [refresh]);
	const handleSignOut = useCallback(async () => {
		setProfileOpen(false);
		await authClient.signOut();
		queryClient.clear();
	}, []);

	// Both lists carry the same date, so either one answers "how old is this".
	const listDate = priceList.data?.[0]?.date;
	const failed = !(priceList.data?.length || priceList.isPending);

	return (
		<BottomSheet isPresented={isPresented} onIsPresentedChange={setProfileOpen}>
			<Group
				modifiers={[
					presentationDetents(["medium", "large"]),
					// The X says "close" plainly; a grabber above it says it twice.
					presentationDragIndicator("visible"),
					presentationBackground(palette.background),
				]}
			>
				<VStack modifiers={[frame({ maxHeight: FILL, width })]} spacing={0}>
					{/* Cut to the navigation bar this sheet covers: same 44pt bar, same
					    screen padding, same accent glyph as the toolbar's own buttons.
					    Stacked rather than laid out in a row so the title is centred on
					    the sheet as the bar centres its own — a row would centre it in
					    whatever space the close button left over. */}
					<ZStack
						modifiers={[
							padding({ horizontal: SCREEN_PADDING, top: 20 }),
							frame({ maxWidth: FILL }),
						]}
					>
						<Text
							modifiers={[
								rounded(24, "semibold"),
								foregroundStyle(palette.primary),
							]}
						>
							Account
						</Text>
						<HStack modifiers={[frame({ maxWidth: FILL })]}>
							<Spacer />
							<RoundGlassButton onPress={close} symbol="xmark" />
						</HStack>
					</ZStack>

					<List
						modifiers={[
							listStyle("insetGrouped"),
							// Lets `presentationBackground` show through; without it the
							// list paints the system grouped grey over our cream.
							scrollContentBackground("hidden"),
							listRowBackground(palette.surface),
						]}
					>
						<Section>
							<HStack spacing={14}>
								<Image
									color={ACCENT}
									size={44}
									systemName="person.crop.circle.fill"
								/>
								<VStack alignment="leading" spacing={2}>
									<Text
										modifiers={[
											rounded(18, "bold"),
											foregroundStyle(palette.primary),
										]}
									>
										{session?.user.name ?? "Signed in"}
									</Text>
									<Text
										modifiers={[rounded(13), foregroundStyle(palette.label)]}
									>
										{session?.user.email ?? ""}
									</Text>
								</VStack>
								<Spacer />
							</HStack>
						</Section>

						{/* The list's date sits next to the button that refreshes it. */}
						<Section title="RAP LIST">
							<HStack>
								<Text
									modifiers={[
										rounded(16, "medium"),
										foregroundStyle(palette.primary),
									]}
								>
									Price list
								</Text>
								<Spacer />
								<Text
									modifiers={[
										rounded(16, "semibold"),
										foregroundStyle(failed ? DESTRUCTIVE : palette.label),
										monospacedDigit(),
									]}
								>
									{failed ? "NO LIST" : formatRapDate(listDate)}
								</Text>
							</HStack>
							<SheetRow
								busy={refresh.isPending}
								label="Refresh price list"
								onPress={handleRefresh}
								symbol="arrow.clockwise"
								tone={palette.primary}
							/>
						</Section>

						<Section>
							<SheetRow
								label="Sign out"
								onPress={handleSignOut}
								symbol="rectangle.portrait.and.arrow.right"
								tone={DESTRUCTIVE}
							/>
						</Section>
					</List>
				</VStack>
			</Group>
		</BottomSheet>
	);
}
