import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		tailwindcss(),
		tanstackStart(),
		nitro({
			noExternals: ["@sentry/tanstackstart-react"],
			serverAssets: [
				{
					baseName: "og",
					dir: "./public",
					pattern: "{logo.png,inter-semi-bold.ttf,BIZUDPGothic-Bold.ttf}",
				},
			],
		}),
		viteReact(),
		sentryTanstackStart({
			org: "reimei",
			project: "evame-vercel",
			authToken: process.env.SENTRY_AUTH_TOKEN,
			silent: !process.env.CI,
			reactComponentAnnotation: { enabled: true },
			tunnelRoute: "/monitoring",
		}),
	],
});
