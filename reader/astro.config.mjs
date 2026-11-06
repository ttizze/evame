import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { serverHtmlParser } from "../html-parser-plugin";

export default defineConfig({
	output: "server",
	site: "https://evame.tech",
	publicDir: "../public",
	session: false,
	adapter: cloudflare({ imageService: "passthrough" }),
	integrations: [react()],
	vite: {
		envPrefix: ["PUBLIC_", "VITE_"],
		resolve: {
			alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
		},
		plugins: [
			tailwindcss(),
			{
				...serverHtmlParser,
				applyToEnvironment: (environment) => environment.name !== "client",
			},
		],
	},
});
