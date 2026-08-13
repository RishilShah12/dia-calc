import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Studio pointed at the local dev database.
 *
 * `alchemy dev` does not create a real Cloudflare D1 — it runs miniflare, which
 * keeps the database as an ordinary SQLite file on disk. Studio can open that
 * directly, so this config exists purely to hand it the path.
 *
 * The sibling `drizzle.config.ts` uses the `d1-http` driver, which only works
 * against a deployed D1 and the Cloudflare credentials that go with it. Use
 * that one once there is something to connect to.
 */
// Relative to the package directory, which is where pnpm and turbo both run
// package scripts from. drizzle-kit bundles this config to CJS, so
// `import.meta.dirname` is not available here.
const D1_DIR = resolve(
	process.cwd(),
	"../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject"
);

function findLocalDatabase() {
	if (!existsSync(D1_DIR)) {
		throw new Error(
			`No local database yet at ${D1_DIR}. Run \`pnpm --filter @dia-calc/infra dev\` once to create it.`
		);
	}

	// Miniflare names the file after a hash of the D1 binding, so it is found
	// rather than hardcoded — renaming or resetting the database changes it.
	const file = readdirSync(D1_DIR).find(
		(name) => name.endsWith(".sqlite") && name !== "metadata.sqlite"
	);

	if (!file) {
		throw new Error(
			`No SQLite file in ${D1_DIR}. Run \`pnpm --filter @dia-calc/infra dev\` once to create it.`
		);
	}

	return resolve(D1_DIR, file);
}

export default defineConfig({
	dbCredentials: { url: `file:${findLocalDatabase()}` },
	dialect: "sqlite",
	out: "./src/migrations",
	schema: "./src/schema",
});
