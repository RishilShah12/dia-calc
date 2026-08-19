import {
	Button,
	Column,
	Host,
	OutlinedTextField,
	Row,
	Text,
	useNativeState,
} from "@expo/ui/jetpack-compose";
import {
	clickable,
	fillMaxSize,
	fillMaxWidth,
	height as heightOf,
	padding,
} from "@expo/ui/jetpack-compose/modifiers";
import { useCallback, useRef } from "react";

import { DESTRUCTIVE, s } from "@/components/calc-base";
import { MaterialIcon, rounded } from "@/components/calc-kit-compose";
import {
	ACCENT,
	ON_ACCENT,
	paletteFor,
	useScheme,
} from "@/components/calc-theme";
import { type AuthMode, useAuthForm } from "@/hooks/use-auth-form";

/**
 * Sign in on Android.
 *
 * No Apple button: `expo-apple-authentication` is iOS-only, so Google and
 * email are the two ways in here. An account created with Apple has no
 * password to fall back on, which is worth knowing before anyone tries.
 *
 * The iOS screen's blurred radial "bloom" does not come across: a full-screen
 * Compose `blur` is a hardware-layer effect and the wrong thing to hand a
 * low-end device on the very first screen. Flat background instead.
 */

export type { AuthMode } from "@/hooks/use-auth-form";

const FIELD_H = 56;
const H_PADDING = 20;

export function AuthScreen({ mode }: { mode: AuthMode }) {
	const scheme = useScheme();
	const palette = paletteFor(scheme);
	const form = useAuthForm(mode);
	const { submit } = form;

	// Keystrokes stay on the UI thread; the refs mirror them for submit, which
	// is the only moment JavaScript needs the value.
	const emailState = useNativeState("");
	const passwordState = useNativeState("");
	const nameState = useNativeState("");
	const email = useRef("");
	const password = useRef("");
	const name = useRef("");

	const onEmail = useCallback((text: string) => {
		email.current = text;
	}, []);
	const onPassword = useCallback((text: string) => {
		password.current = text;
	}, []);
	const onName = useCallback((text: string) => {
		name.current = text;
	}, []);

	const handleSubmit = useCallback(() => {
		submit({
			email: email.current,
			name: name.current,
			password: password.current,
		});
	}, [submit]);

	const fieldColors = {
		cursorColor: ACCENT,
		focusedBorderColor: ACCENT,
		focusedLabelColor: ACCENT,
		unfocusedBorderColor: palette.hairline,
		unfocusedLabelColor: palette.label,
	};
	const fieldText = {
		color: palette.primary,
		fontFamily: rounded(17).fontFamily,
		fontSize: 17,
	};

	return (
		<Host
			colorScheme={scheme}
			seedColor={ACCENT}
			style={{ backgroundColor: palette.background, flex: 1 }}
		>
			<Column
				horizontalAlignment="center"
				modifiers={[fillMaxSize(), padding(H_PADDING, 0, H_PADDING, 0)]}
				verticalArrangement="center"
			>
				<Column
					horizontalAlignment="center"
					modifiers={[fillMaxWidth(), padding(0, 0, 0, s(24))]}
					verticalArrangement={{ spacedBy: 6 }}
				>
					<MaterialIcon color={ACCENT} glyph={40} name="diamond" />
					<Row>
						<Text color={palette.primary} style={rounded(34, "bold")}>
							EZ
						</Text>
						<Text color={ACCENT} style={rounded(34, "bold")}>
							Calc
						</Text>
					</Row>
					<Text color={palette.label} style={rounded(14)}>
						{form.isSignUp
							? "Rapaport pricing, in your pocket"
							: "Sign in to price a stone"}
					</Text>
				</Column>

				<Column
					modifiers={[fillMaxWidth()]}
					verticalArrangement={{ spacedBy: 12 }}
				>
					{form.isSignUp ? (
						<OutlinedTextField
							colors={fieldColors}
							keyboardOptions={{ capitalization: "words" }}
							modifiers={[fillMaxWidth()]}
							onValueChange={onName}
							singleLine
							textStyle={fieldText}
							value={nameState}
						>
							<OutlinedTextField.Label>
								<Text style={rounded(14)}>Name</Text>
							</OutlinedTextField.Label>
						</OutlinedTextField>
					) : null}

					<OutlinedTextField
						colors={fieldColors}
						keyboardOptions={{
							autoCorrectEnabled: false,
							capitalization: "none",
							keyboardType: "email",
						}}
						modifiers={[fillMaxWidth()]}
						onValueChange={onEmail}
						singleLine
						textStyle={fieldText}
						value={emailState}
					>
						<OutlinedTextField.Label>
							<Text style={rounded(14)}>Email</Text>
						</OutlinedTextField.Label>
					</OutlinedTextField>

					<OutlinedTextField
						colors={fieldColors}
						keyboardOptions={{
							autoCorrectEnabled: false,
							capitalization: "none",
							keyboardType: "password",
						}}
						modifiers={[fillMaxWidth()]}
						onValueChange={onPassword}
						singleLine
						textStyle={fieldText}
						value={passwordState}
						visualTransformation="password"
					>
						<OutlinedTextField.Label>
							<Text style={rounded(14)}>Password</Text>
						</OutlinedTextField.Label>
					</OutlinedTextField>

					{/* Reserved either way, so the form does not jump when it fills. */}
					<Row modifiers={[fillMaxWidth(), heightOf(18)]}>
						<Text color={DESTRUCTIVE} style={rounded(12, "medium")}>
							{form.error ?? ""}
						</Text>
					</Row>

					<Button
						colors={{ containerColor: ACCENT, contentColor: ON_ACCENT }}
						enabled={!form.busy}
						modifiers={[fillMaxWidth(), heightOf(FIELD_H)]}
						onClick={handleSubmit}
					>
						<Text color={ON_ACCENT} style={rounded(17, "semibold")}>
							{form.isSignUp ? "Create account" : "Sign in"}
						</Text>
					</Button>

					<Button
						colors={{
							containerColor: palette.surface,
							contentColor: palette.primary,
						}}
						enabled={!form.busy}
						modifiers={[fillMaxWidth(), heightOf(FIELD_H)]}
						onClick={form.withGoogle}
					>
						<Row
							horizontalArrangement={{ spacedBy: 10 }}
							verticalAlignment="center"
						>
							<MaterialIcon color={palette.primary} glyph={20} name="login" />
							<Text color={palette.primary} style={rounded(17, "semibold")}>
								Continue with Google
							</Text>
						</Row>
					</Button>
				</Column>

				<Row
					horizontalArrangement="center"
					modifiers={[
						fillMaxWidth(),
						clickable(form.swap),
						padding(0, s(18), 0, s(18)),
					]}
				>
					<Text color={palette.label} style={rounded(14)}>
						{form.isSignUp
							? "Already have an account? Sign in"
							: "New here? Create an account"}
					</Text>
				</Row>
			</Column>
		</Host>
	);
}
