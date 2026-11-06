import "dotenv/config";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { serverHtmlParser } from "./html-parser-plugin";
import { securityHeaders } from "./security-headers";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	server: { proxy: { "/_astro": "http://localhost:3001" } },
	optimizeDeps: { exclude: ["@cloudflare/pages-plugin-vercel-og"] },
	environments: {
		ssr: {
			optimizeDeps: {
				exclude: ["@cloudflare/pages-plugin-vercel-og"],
				rolldownOptions: {
					plugins: [serverHtmlParser],
				},
			},
		},
	},
	plugins: [
		{
			...serverHtmlParser,
			applyToEnvironment: (environment) => environment.name === "ssr",
		},
		{
			name: "security-headers",
			generateBundle() {
				if (this.environment.name === "client")
					this.emitFile({
						type: "asset",
						fileName: "_headers",
						source: `/*\n${Object.entries(securityHeaders)
							.map(([name, value]) => `  ${name}: ${value}`)
							.join("\n")}\n`,
					});
			},
		},
		cloudflare({
			viteEnvironment: { name: "ssr" },
			config: {
				assets: {
					binding: "ASSETS",
					html_handling: "drop-trailing-slash",
				},
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		sentryCloudflareVitePlugin(),
		sentryVitePlugin({
			org: "reimei",
			project: "evame-vercel",
			authToken: process.env.SENTRY_AUTH_TOKEN,
			silent: !process.env.CI,
			reactComponentAnnotation: { enabled: true },
			sourcemaps: { assets: ["./dist/**"] },
		}),
	],
});
