import alchemy from "alchemy";
import { D1Database, Nextjs, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

function isProdStage(): boolean {
	if (process.env.ALCHEMY_STAGE === "prod" || process.env.STAGE === "prod") {
		return true;
	}
	const stageIdx = process.argv.indexOf("--stage");
	if (stageIdx !== -1 && process.argv[stageIdx + 1] === "prod") {
		return true;
	}
	return process.argv.includes("prod");
}

const prod = isProdStage();
const envSuffix = prod ? ".prod" : "";

config({ path: `./.env${envSuffix}` });
config({ path: `../../apps/web/.env${envSuffix}` });
config({ path: `../../apps/server/.env${envSuffix}` });

const app = await alchemy("dia-calc");

const db = await D1Database("database", {
	migrationsDir: "../../packages/db/src/migrations",
});

export const server = await Worker("server", {
	bindings: {
		APPLE_CLIENT_ID: alchemy.env.APPLE_CLIENT_ID!,
		APPLE_CLIENT_SECRET: alchemy.secret.env.APPLE_CLIENT_SECRET!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		DB: db,
		GOOGLE_CLIENT_ID: alchemy.env.GOOGLE_CLIENT_ID!,
		GOOGLE_CLIENT_SECRET: alchemy.secret.env.GOOGLE_CLIENT_SECRET!,
		RAPNET_CLIENT_ID: alchemy.secret.env.RAPNET_CLIENT_ID!,
		RAPNET_CLIENT_SECRET: alchemy.secret.env.RAPNET_CLIENT_SECRET!,
	},
	compatibility: "node",
	cwd: "../../apps/server",
	dev: {
		port: 3000,
	},
	entrypoint: "src/index.ts",
	url: true,
});

export const web = await Nextjs("web", {
	bindings: {
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		DB: db,
		NEXT_PUBLIC_SERVER_URL: server.url!,
	},
	cwd: "../../apps/web",
	dev: {
		env: {
			PORT: "3001",
		},
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
