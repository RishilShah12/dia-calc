import { expo } from "@better-auth/expo";
import { createDb } from "@dia-calc/db";
import * as schema from "@dia-calc/db/schema/auth";
import { env } from "@dia-calc/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		advanced: {
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "none",
				secure: true,
			},
			// uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
			// https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
			// crossSubDomainCookies: {
			//   enabled: true,
			//   domain: "<your-workers-subdomain>",
			// },
		},
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(db, {
			provider: "sqlite",

			schema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [expo()],
		// uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
		// session: {
		//   cookieCache: {
		//     enabled: true,
		//     maxAge: 60,
		//   },
		// },
		secret: env.BETTER_AUTH_SECRET,
		socialProviders: {
			// Apple's `clientSecret` is a signed JWT that expires every six months,
			// not a static string — regenerate it when you swap the placeholders out.
			// `appBundleIdentifier` is what lets the native Sign in with Apple sheet
			// verify, since its audience is the bundle ID rather than the service ID.
			apple: {
				appBundleIdentifier: "com.rishilshah.dia-calc",
				clientId: env.APPLE_CLIENT_ID,
				clientSecret: env.APPLE_CLIENT_SECRET,
			},
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			},
		},
		trustedOrigins: [
			env.CORS_ORIGIN,
			"dia-calc://",
			"exp://",
			"http://localhost:8081",
		],
	});
}
