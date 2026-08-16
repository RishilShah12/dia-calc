import { formatRapDate } from "@dia-calc/calc/rap-calc";
import {
	Column,
	ModalBottomSheet,
	Row,
	Spacer,
	Text,
} from "@expo/ui/jetpack-compose";
import {
	clickable,
	fillMaxWidth,
	padding,
	size,
} from "@expo/ui/jetpack-compose/modifiers";
import { useIsFocused } from "expo-router";

import { DESTRUCTIVE, SCREEN_PADDING, s } from "@/components/calc-base";
import {
	Caption,
	MaterialIcon,
	type MaterialSymbolName,
	rounded,
} from "@/components/calc-kit-compose";
import { ACCENT, type CalcPalette } from "@/components/calc-theme";
import { useProfileSheet } from "@/hooks/use-profile-sheet";

/**
 * The account sheet on Android.
 *
 * Metro hands this to Android and leaves `calc-profile.tsx` — the SwiftUI one —
 * to iOS and web, so the three screens keep rendering `<ProfileSheet />` with
 * nothing to pass. Both are driven by the same store in `lib/profile-sheet`,
 * which is what joins them to the toolbar button.
 *
 * Unlike iOS, this must not mount three times. The drawer keeps all three
 * screens alive, and where SwiftUI only presents the sheet whose `Host` is on
 * screen, a Compose `ModalBottomSheet` from a backgrounded screen would stack.
 * `useIsFocused` is what keeps exactly one in play.
 */

const GLYPH = 22;

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
	symbol: MaterialSymbolName;
	tone: string;
}) {
	const title = busy ? "Refreshing…" : label;
	return (
		<Row
			horizontalArrangement={{ spacedBy: 12 }}
			modifiers={[
				clickable(onPress),
				fillMaxWidth(),
				padding(SCREEN_PADDING, s(12), SCREEN_PADDING, s(12)),
			]}
			verticalAlignment="center"
		>
			<MaterialIcon color={tone} glyph={GLYPH} name={symbol} />
			<Text color={tone} style={rounded(16, "medium")}>
				{title}
			</Text>
			<Spacer />
		</Row>
	);
}

function Identity({
	email,
	name,
	palette,
}: {
	email: string;
	name: string;
	palette: CalcPalette;
}) {
	return (
		<Row
			horizontalArrangement={{ spacedBy: 14 }}
			modifiers={[
				fillMaxWidth(),
				padding(SCREEN_PADDING, s(8), SCREEN_PADDING, s(8)),
			]}
			verticalAlignment="center"
		>
			<MaterialIcon color={ACCENT} glyph={44} name="account_circle" />
			<Column verticalArrangement={{ spacedBy: 2 }}>
				<Text color={palette.primary} style={rounded(18, "bold")}>
					{name}
				</Text>
				<Text color={palette.label} style={rounded(13)}>
					{email}
				</Text>
			</Column>
		</Row>
	);
}

export function ProfileSheet() {
	const profile = useProfileSheet();
	const focused = useIsFocused();
	const { palette } = profile;

	if (!(profile.isPresented && focused)) {
		return null;
	}

	return (
		<ModalBottomSheet
			containerColor={palette.background}
			contentColor={palette.primary}
			onDismissRequest={profile.close}
			showDragHandle
		>
			<Column
				modifiers={[fillMaxWidth(), padding(0, s(4), 0, s(24))]}
				verticalArrangement={{ spacedBy: s(4) }}
			>
				<Row
					modifiers={[
						fillMaxWidth(),
						padding(SCREEN_PADDING, 0, SCREEN_PADDING, s(4)),
					]}
				>
					<Text color={palette.primary} style={rounded(24, "semibold")}>
						Account
					</Text>
				</Row>

				<Identity
					email={profile.session?.user.email ?? ""}
					name={profile.session?.user.name ?? "Signed in"}
					palette={palette}
				/>

				<Row
					modifiers={[
						fillMaxWidth(),
						padding(SCREEN_PADDING, s(12), SCREEN_PADDING, s(4)),
					]}
					verticalAlignment="center"
				>
					<Caption color={palette.label}>PRICE LIST</Caption>
					<Spacer modifiers={[size(s(12), 1)]} />
					<Text
						color={profile.failed ? DESTRUCTIVE : palette.label}
						style={rounded(16, "medium")}
					>
						{profile.failed ? "NO LIST" : formatRapDate(profile.listDate)}
					</Text>
				</Row>

				<SheetRow
					busy={profile.refreshing}
					label="Refresh price list"
					onPress={profile.handleRefresh}
					symbol="refresh"
					tone={palette.primary}
				/>
				<SheetRow
					label="Sign out"
					onPress={profile.handleSignOut}
					symbol="logout"
					tone={DESTRUCTIVE}
				/>
			</Column>
		</ModalBottomSheet>
	);
}
