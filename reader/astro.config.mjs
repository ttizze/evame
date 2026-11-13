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
										test: /node_modules\/(?:react|react-dom|scheduler)\//,
										priority: 30,
									},
									{
										name: "icons",
										test: /node_modules\/lucide-react\//,
										priority: 20,
									},
									{
										name: "monitoring",
										test: /node_modules\/@sentry(?:-internal)?\//,
										priority: 15,
									},
									{
										name: "primitives",
										test: /node_modules\/(?:@radix-ui|@floating-ui)\//,
										priority: 10,
									},
									{
										name: "reader-runtime",
										test: (id) =>
											id.endsWith("/src/i18n/messages.ts") ||
											id.endsWith("/reader/src/components/providers.tsx") ||
											/node_modules\/(?:swr|nuqs|use-intl|better-auth|@better-auth|clsx|tailwind-merge|class-variance-authority|nanostores|@nanostores)\//.test(
												id,
											),
										priority: 5,
									},
									{
										name: "reader-ui",
										test: (id) =>
											/src\/components\/ui\/(?:button|avatar|dialog|popover|dropdown-menu|separator|command)\.tsx$/.test(
												id,
											) ||
											[
												"/_components/start-button.tsx",
												"/_components/login/_components/login-dialog.tsx",
												"/_components/header/translation-help-popover.client.tsx",
											].some((path) => id.endsWith(path)),
										priority: 4,
									},
									{
										name: "reader-shared",
										test: (id) =>
											[
												"/src/app/_hooks/use-hydrated.",
												"/src/app/_service/reader-action.",
												"/src/app/_domain/reader-route.",
												"/src/app/[locale]/(common-layout)/_components/view-query.",
												"/src/app/[locale]/(common-layout)/_components/header/hooks/",
											].some((path) => id.includes(path)),
										priority: 3,
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
