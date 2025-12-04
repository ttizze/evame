import * as path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const sharedResolve = {
	alias: {
		"@": path.resolve(__dirname, "src"),
		"next/server": path.resolve(__dirname, "node_modules/next/server.js"),
		"next/navigation": "next/navigation.js",
	},
};

const sharedTestConfig = {
	globals: true,
	env: {
		SESSION_SECRET: "test",
		// DATABASE_URLは*.integration.test.tsのテストでvitest.setup.db.tsで設定される（worker IDベースのDB名に変換）
		ENCRYPTION_KEY:
			"2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
		RESEND_API_KEY: "test",
		MAGIC_LINK_SECRET: "test",
	},
	environment: "jsdom",
	server: {
		deps: {
			inline: ["next-auth", "next-intl", "react-tweet"],
		},
	},
};

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		projects: [
			{
				test: {
					...sharedTestConfig,
					setupFiles: ["./vitest.setup.ts"],
					include: [
						"**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
						"**/*.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
					],
					exclude: [
						"**/node_modules/**",
						"**/*.integration.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
						"**/*.integration.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
					],
				},
				resolve: sharedResolve,
			},
			{
				test: {
					...sharedTestConfig,
					setupFiles: ["./vitest.setup.ts", "./vitest.setup.db.ts"],
					include: [
						"**/*.integration.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
						"**/*.integration.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
					],
					exclude: ["**/node_modules/**"],
				},
				resolve: sharedResolve,
			},
		],
	},
});
