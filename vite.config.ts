import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { securityHeaders } from "./security-headers";
import { supportedLocaleOptions } from "./src/app/_constants/locale";
import { staticHomePaths } from "./static-home-paths";

const serverHtmlParser = {
	name: "server-html-parser",
	resolveId: {
		order: "pre" as const,
		handler(source: string) {
			if (source === "html-dom-parser")
				return fileURLToPath(
					import.meta.resolve("html-dom-parser/lib/server/html-to-dom"),
				);
		},
	},
};

export default defineConfig({
	resolve: { tsconfigPaths: true },
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
					run_worker_first: [...staticHomePaths.keys()],
				},
			},
		}),
		tailwindcss(),
		tanstackStart({
			prerender: {
				enabled: true,
				autoStaticPathsDiscovery: false,
				crawlLinks: false,
				concurrency: 4,
			},
			pages: supportedLocaleOptions.map(({ code }) => ({ path: `/${code}` })),
		}),
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
