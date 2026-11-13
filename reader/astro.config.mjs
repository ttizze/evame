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
	integrations: [
		react(),
		{
			name: "interaction",
			hooks: {
				"astro:config:setup": ({ addClientDirective }) => {
					addClientDirective({
						name: "interaction",
						entrypoint: fileURLToPath(
							new URL("./src/directives/interaction.ts", import.meta.url),
						),
					});
				},
			},
		},
	],
	vite: {
		envPrefix: ["PUBLIC_", "VITE_"],
		resolve: {
			alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
		},
		environments: {
			client: {
				build: {
					rolldownOptions: {
						output: {
							codeSplitting: {
								// 初回に共有する依存だけをまとめ、フォームや本文処理は遅延チャンクに残す。
								groups: [
									{
										name: "react",
										test: /node_modules\/react\//,
										priority: 30,
									},
									{
										name: "monitoring",
										test: (id) =>
											id.endsWith("/src/instrument.client.ts") ||
											/node_modules\/@sentry(?:-internal)?\//.test(id),
										priority: 25,
									},
									{
										name: "reader-native",
										test: (id) => id.endsWith("/reader/src/client.ts"),
										priority: 5,
									},
									{
										name: "reader-ui",
										test: (id) =>
											id.endsWith("/reader/src/components/providers.tsx"),
										priority: 2,
									},
								],
							},
						},
					},
				},
			},
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
