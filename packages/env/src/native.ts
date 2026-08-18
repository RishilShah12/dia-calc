import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		EXPO_PUBLIC_SERVER_URL: z.url(),
	},
	clientPrefix: "EXPO_PUBLIC_",
	emptyStringAsUndefined: true,
	// Metro only inlines EXPO_PUBLIC_* when accessed as process.env.EXPO_PUBLIC_* —
	// passing the whole process.env object leaves an empty object in Hermes release builds.
	runtimeEnv: {
		EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
	},
});
