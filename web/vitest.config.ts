import * as path from "node:path";
import * as VitestConfig from "vitest/config";

export default VitestConfig.defineConfig({
	test: {
		globals: true,
		env: {
			SESSION_SECRET: "test",
			DATABASE_URL:
				"postgresql://postgres:password@localhost:5433/testdb?schema=public",
			ENCRYPTION_KEY: "2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
		},
		environment: "vprisma",
		setupFiles: ["vitest-environment-vprisma/setup", "vitest.setup.ts"],
		environmentOptions: {
			vprisma: {
				baseEnv: "jsdom",
			},
		},
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "app"),
		},
	},
});
