import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Calculator from "./calculator";

/**
 * The calculator is the product, so it owns `/`.
 *
 * Gated twice: this redirect, and `protectedProcedure` on the RPC itself. The
 * Rapaport list is copyrighted and subscriber-only, so it must never reach an
 * anonymous request.
 */
export default async function HomePage() {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <Calculator />;
}
