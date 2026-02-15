import * as path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		globals: true,
		slowTestThreshold: 1000,
		exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"],
		env: {
			// DATABASE_URLを空に設定して.envの値を上書き
			DATABASE_URL: "",
			SESSION_SECRET: "test",
			ENCRYPTION_KEY:
				"2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
			RESEND_API_KEY: "test",
			MAGIC_LINK_SECRET: "test",
			// テスト環境のログレベルは logger.ts で自動的に "error" に設定される
			// 特定のテストでログを見たい場合は、ここで明示的に設定可能
			// LOG_LEVEL: "debug",
		},
		environment: "jsdom",
		setupFiles: "./vitest.setup.ts",
		server: {
			deps: {
				inline: ["next-auth", "next-intl", "react-tweet"],
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			// Worktrees may not have a local `node_modules`; rely on Node resolution.
			"next/server": "next/server.js",
			"next/navigation": "next/navigation.js",
		},
	},
});
