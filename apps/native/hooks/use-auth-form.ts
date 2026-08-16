import { router } from "expo-router";
import { useCallback, useState } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

/**
 * Credential validation and the three ways in, shared by both platforms' sign-in
 * screens.
 *
 * `submit` takes the values rather than owning them: each platform keeps
 * keystrokes off the JS thread its own way — `useNativeState` plus refs on iOS,
 * the Compose equivalent on Android — and neither wants this hook holding a
 * second copy that re-renders on every character.
 *
 * Two copies of credential validation is the kind of drift you cannot afford,
 * which is why this is shared even though it is small.
 */

export type AuthMode = "sign-in" | "sign-up";

export interface Credentials {
	email: string;
	name: string;
	password: string;
}

const credentials = z.object({
	email: z.email("Enter a valid email address"),
	name: z.string(),
	password: z.string().min(8, "Use at least 8 characters"),
});

export const firstIssue = (error: unknown): string => {
	if (error instanceof z.ZodError) {
		return error.issues[0]?.message ?? "Check the details and try again";
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Something went wrong. Try again.";
};

export function useAuthForm(mode: AuthMode) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isSignUp = mode === "sign-up";

	/** Every path lands here on success, or the calculator query stays stale. */
	const settle = useCallback(() => {
		setBusy(false);
		queryClient.refetchQueries();
	}, []);

	const submit = useCallback(
		async (raw: Credentials) => {
			setError(null);
			setBusy(true);
			try {
				const values = credentials.parse({
					email: raw.email.trim(),
					name: isSignUp ? raw.name.trim() : "—",
					password: raw.password,
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
		},
		[isSignUp, settle]
	);

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

	const swap = useCallback(() => {
		router.replace(isSignUp ? "/sign-in" : "/sign-up");
	}, [isSignUp]);

	return {
		busy,
		error,
		isSignUp,
		setBusy,
		setError,
		settle,
		submit,
		swap,
		withGoogle,
	};
}
