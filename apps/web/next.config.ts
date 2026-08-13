import "@dia-calc/env/web";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	typedRoutes: true,
};

export default nextConfig;

initOpenNextCloudflareForDev();
