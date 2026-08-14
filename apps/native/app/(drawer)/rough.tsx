import { Redirect } from "expo-router";

import { RoughCalculator } from "@/components/rough-calculator";
import { authClient } from "@/lib/auth-client";

/**
 * Gated twice, same as the polish route: this check, and `protectedProcedure`
 * on `priceList.get` itself. The Rapaport list is copyrighted and
 * subscriber-only, so it must never reach an anonymous request.
 */
export default function Rough() {
	const { data: session, isPending } = authClient.useSession();

	// Redirecting while the stored session is still being read would bounce a
	// signed-in user out to the auth screen on every cold start.
	if (isPending) {
		return null;
	}

	if (!session?.user) {
		return <Redirect href="/sign-in" />;
	}

	return <RoughCalculator />;
}
