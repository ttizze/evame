import * as path from "node:path";
import * as VitestConfig from "vitest/config";

export default VitestConfig.defineConfig({
	test: {
		globals: true,
		env: {
			SESSION_SECRET: "test",
			DATABASE_URL:
				"postgresql://postgres:password@localhost:5433/postgres?schema=public",
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
