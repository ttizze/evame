import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const excludedTests = ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"];
const domTests = [
	"**/*.{test,spec}.?(c|m)[jt]sx",
	"**/block-editing.test.ts",
	"**/article-title.test.ts",
	"**/auth-client.test.ts",
];

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		slowTestThreshold: 1000,
		exclude: excludedTests,
		env: {
			// 本番の接続先をテストへ持ち込まない。
			TURSO_DATABASE_URL: "",
			TURSO_AUTH_TOKEN: "",
			SENTRY_DSN: "",
			VITE_SENTRY_DSN: "",
			SESSION_SECRET: "test",
			ENCRYPTION_KEY:
				"2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
			RESEND_API_KEY: "test",
			MAGIC_LINK_SECRET: "test",
			// テスト環境のログレベルは logger.ts で自動的に "error" に設定される
			// 特定のテストでログを見たい場合は、ここで明示的に設定可能
			// LOG_LEVEL: "debug",
		},
		environment: "node",
		projects: [
			{
				extends: true,
				test: { name: "node", exclude: [...excludedTests, ...domTests] },
			},
			{
				extends: true,
				test: { name: "dom", environment: "jsdom", include: domTests },
			},
		],
		setupFiles: "./vitest.setup.ts",
		server: {
			deps: {
				inline: ["react-tweet"],
			},
		},
	},
	resolve: {
		alias: {
			"@cloudflare/pages-plugin-vercel-og/api": "@vercel/og",
			"cloudflare:workers": new URL(
				"./src/tests/cloudflare.ts",
				import.meta.url,
			).pathname,
		},
		tsconfigPaths: true,
	},
});
