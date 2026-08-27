import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		globals: true,
		slowTestThreshold: 1000,
		include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
		exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"],
		env: {
			TURSO_DATABASE_URL: "",
			TURSO_AUTH_TOKEN: "test",
		},
		environment: "jsdom",
		setupFiles: "./vitest.setup.start.ts",
	},
});
