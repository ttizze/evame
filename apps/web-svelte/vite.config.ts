import * as path from "node:path";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "../../src"),
		},
	},
	server: {
		fs: {
			allow: [path.resolve(__dirname, "../..")],
		},
	},
});
