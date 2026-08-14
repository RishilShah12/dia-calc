import { Host } from "@expo/ui";
import {
	Button,
	Ellipse,
	HStack,
	Image,
	SecureField,
	Spacer,
	Text,
	TextField,
	useNativeState,
	VStack,
	ZStack,
} from "@expo/ui/swift-ui";
import {
	autocorrectionDisabled,
	blur,
	buttonStyle,
	font,
	foregroundStyle,
	frame,
	glassEffect,
	keyboardType,
	offset,
	padding,
	textContentType,
	textFieldStyle,
	textInputAutocapitalization,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import {
	AppleAuthenticationScope,
	signInAsync,
} from "expo-apple-authentication";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import { z } from "zod";

import {
	ACCENT,
	type CalcPalette,
	ON_ACCENT,
	paletteFor,
	supportsLiquidGlass,
} from "@/components/calc-theme";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

/**
 * One screen serving both sign-in and sign-up — they differ only by a name
 * field and the footer link, and keeping them in one file stops the glass
 * treatment and the social buttons from drifting apart.
 *
 * Fields are SwiftUI `TextField`/`SecureField` rather than the universal
 * `TextInput`: the universal components are a separate rendering layer and do
 * not compose inside a `@expo/ui/swift-ui` tree — they mount as nothing. Both
 * take the same `useNativeState` observable, so keystrokes still land on the UI
 * thread without a React render.
 */

export type AuthMode = "sign-in" | "sign-up";

const FIELD_H = 52;

const rounded = (
	size: number,
	weight: "regular" | "medium" | "semibold" | "bold" = "regular"
) => font({ design: "rounded", size, weight });

const glass = buttonStyle(supportsLiquidGlass ? "glass" : "bordered");
const glassProminent = buttonStyle(
	supportsLiquidGlass ? "glassProminent" : "borderedProminent"
);

const H_PADDING = 20;
const ROW_GAP = 10;
/**
 * A glass button draws its capsule outside the label, so a label sized to the
 * full content width yields a button wider than the fields beside it. Measured
 * inset per side.
 */
const BUTTON_INSET = 24;

const fieldChrome = (width: number) => [
	textFieldStyle("plain"),
	rounded(17),
	padding({ horizontal: 16 }),
	frame({ height: FIELD_H, width }),
	glassEffect({ cornerRadius: 16, shape: "roundedRectangle" }),
];

const credentials = z.object({
	email: z.email("Enter a valid email address"),
	name: z.string(),
	password: z.string().min(8, "Use at least 8 characters"),
});

const firstIssue = (error: unknown): string => {
	if (error instanceof z.ZodError) {
		return error.issues[0]?.message ?? "Check the details and try again";
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Something went wrong. Try again.";
};

/**
 * Placeholder for the light-refraction artwork, in the colours the final asset
 * will use. It fills the whole screen deliberately — a band that stopped
 * partway left a flat slab of paper under the card.
 */
function Bloom({ height, palette }: { height: number; palette: CalcPalette }) {
	return (
		<Ellipse
			modifiers={[
				foregroundStyle({
					center: { x: 0.5, y: 0.3 },
					colors: [ACCENT, "#E2745C", palette.background],
					endRadius: height * 0.62,
					startRadius: 0,
					type: "radialGradient",
				}),
				frame({ height: height * 1.35, width: height * 1.35 }),
				blur(60),
				offset({ y: -height * 0.3 }),
			]}
		/>
	);
}

function SocialButton({
	label,
	onPress,
	palette,
	symbol,
	width,
}: {
	label: string;
	onPress: () => void;
	palette: CalcPalette;
	symbol: "apple.logo" | "g.circle.fill";
	width: number;
}) {
	return (
		<Button modifiers={[glass]} onPress={onPress}>
			<HStack modifiers={[frame({ height: FIELD_H, width })]} spacing={8}>
				<Image color={palette.primary} size={17} systemName={symbol} />
				<Text
					modifiers={[
						rounded(16, "semibold"),
						foregroundStyle(palette.primary),
					]}
				>
					{label}
				</Text>
			</HStack>
		</Button>
	);
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const palette = paletteFor(scheme);
	const { height, width } = useWindowDimensions();
	const contentWidth = width - H_PADDING * 2;
	const submitLabelWidth = contentWidth - BUTTON_INSET * 2;
	const halfWidth = (contentWidth - ROW_GAP) / 2 - BUTTON_INSET * 2;
	const chrome = fieldChrome(contentWidth);

	const isSignUp = mode === "sign-up";

	// `useNativeState` keeps each keystroke on the UI thread, so the field
	// updates without a React render. The refs mirror it for submit, which is
	// the only moment JS needs the value.
	const emailState = useNativeState("");
	const passwordState = useNativeState("");
	const nameState = useNativeState("");
	const email = useRef("");
	const password = useRef("");
	const name = useRef("");

	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onEmail = useCallback((text: string) => {
		email.current = text;
	}, []);
	const onPassword = useCallback((text: string) => {
		password.current = text;
	}, []);
	const onName = useCallback((text: string) => {
		name.current = text;
	}, []);

	/** Every path lands here on success, or the calculator query stays stale. */
	const settle = useCallback(() => {
		setBusy(false);
		queryClient.refetchQueries();
	}, []);

	const submit = useCallback(async () => {
		setError(null);
		setBusy(true);
		try {
			const values = credentials.parse({
				email: email.current.trim(),
				name: isSignUp ? name.current.trim() : "—",
				password: password.current,
			});
			const { error: authError } = isSignUp
				? await authClient.signUp.email({
						email: values.email,
						name: values.name,
						password: values.password,
					})
				: await authClient.signIn.email({
						email: values.email,
						password: values.password,
					});
			if (authError) {
				throw new Error(authError.message ?? "Could not sign you in");
			}
			settle();
		} catch (caught) {
			setError(firstIssue(caught));
			setBusy(false);
		}
	}, [isSignUp, settle]);

	const withGoogle = useCallback(async () => {
		setError(null);
		setBusy(true);
		try {
			await authClient.signIn.social({
				callbackURL: "dia-calc://",
				provider: "google",
			});
			settle();
		} catch (caught) {
			setError(firstIssue(caught));
			setBusy(false);
		}
	}, [settle]);

	const withApple = useCallback(async () => {
		setError(null);
		setBusy(true);
		try {
			const credential = await signInAsync({
				requestedScopes: [
					AppleAuthenticationScope.FULL_NAME,
					AppleAuthenticationScope.EMAIL,
				],
			});
			if (!credential.identityToken) {
				throw new Error("Apple did not return an identity token");
			}
			// The expo client short-circuits the browser when an idToken is given.
			await authClient.signIn.social({
				idToken: { token: credential.identityToken },
				provider: "apple",
			});
			settle();
		} catch (caught) {
			// The user backing out of the system sheet is not an error worth showing.
			const cancelled =
				caught instanceof Error &&
				caught.message.includes("ERR_REQUEST_CANCELED");
			setError(cancelled ? null : firstIssue(caught));
			setBusy(false);
		}
	}, [settle]);

	const submitLabel = isSignUp ? "Create account" : "Sign in";
	const submitTitle = busy ? "…" : submitLabel;
	const swapTitle = isSignUp
		? "Already have an account? Sign in"
		: "New here? Create an account";
	const subtitle = isSignUp
		? "Create an account to price stones"
		: "Rapaport pricing, in your pocket";

	const swap = useCallback(() => {
		router.replace(isSignUp ? "/sign-in" : "/sign-up");
	}, [isSignUp]);

	return (
		<Host
			colorScheme={scheme}
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			<ZStack modifiers={[frame({ height, width })]}>
				<Bloom height={height} palette={palette} />

				<VStack spacing={0}>
					<Spacer />

					<VStack modifiers={[padding({ bottom: 24 })]} spacing={6}>
						<Image color={ACCENT} size={40} systemName="diamond.fill" />
						<Text
							modifiers={[
								rounded(34, "bold"),
								foregroundStyle(palette.primary),
							]}
						>
							EZ
							<Text modifiers={[foregroundStyle(ACCENT)]}>Calc</Text>
						</Text>
						<Text modifiers={[rounded(14), foregroundStyle(palette.label)]}>
							{subtitle}
						</Text>
					</VStack>

					<VStack modifiers={[frame({ width: contentWidth })]} spacing={12}>
						{isSignUp ? (
							<TextField
								modifiers={[
									...chrome,
									textContentType("name"),
									textInputAutocapitalization("words"),
								]}
								onTextChange={onName}
								placeholder="Name"
								text={nameState}
							/>
						) : null}
						<TextField
							modifiers={[
								...chrome,
								keyboardType("email-address"),
								textContentType("emailAddress"),
								textInputAutocapitalization("never"),
								autocorrectionDisabled(true),
							]}
							onTextChange={onEmail}
							placeholder="Email"
							text={emailState}
						/>
						<SecureField
							modifiers={[...chrome, textContentType("password")]}
							onTextChange={onPassword}
							placeholder="Password"
							text={passwordState}
						/>

						<Text
							modifiers={[
								rounded(12, "medium"),
								foregroundStyle("#D9544D"),
								frame({ height: 16, width: contentWidth }),
							]}
						>
							{error ?? ""}
						</Text>

						<Button modifiers={[glassProminent, tint(ACCENT)]} onPress={submit}>
							<Text
								modifiers={[
									rounded(17, "semibold"),
									foregroundStyle(ON_ACCENT),
									frame({ height: FIELD_H, width: submitLabelWidth }),
								]}
							>
								{submitTitle}
							</Text>
						</Button>

						<HStack spacing={ROW_GAP}>
							<SocialButton
								label="Apple"
								onPress={withApple}
								palette={palette}
								symbol="apple.logo"
								width={halfWidth}
							/>
							<SocialButton
								label="Google"
								onPress={withGoogle}
								palette={palette}
								symbol="g.circle.fill"
								width={halfWidth}
							/>
						</HStack>
					</VStack>

					<Button modifiers={[buttonStyle("plain")]} onPress={swap}>
						<Text
							modifiers={[
								rounded(14),
								foregroundStyle(palette.label),
								padding({ vertical: 18 }),
							]}
						>
							{swapTitle}
						</Text>
					</Button>

					<Spacer />
				</VStack>
			</ZStack>
		</Host>
	);
}
