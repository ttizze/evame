import * as path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		globals: true,
		env: {
			SESSION_SECRET: "test",
			DATABASE_URL:
				"postgresql://postgres:password@localhost:5433/testdb?schema=public",
			ENCRYPTION_KEY:
				"2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
			RESEND_API_KEY: "test",
			MAGIC_LINK_SECRET: "test",
		},
		environment: "jsdom",
		deps: {
			inline: ["next-auth"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"next/server": path.resolve(__dirname, "node_modules/next/server.js"),
		},
	},
});
