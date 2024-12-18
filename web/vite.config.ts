import { vitePlugin as remix } from "@remix-run/dev";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { flatRoutes } from "remix-flat-routes";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/server-runtime" {
	interface Future {
		v3_singleFetch: true;
	}
}

export default defineConfig({
	//sentryにアップロードするため必要､upload後消されるためセキュリティの問題はない
	build: {
		sourcemap: true,
	},
	plugins: [
		envOnlyMacros(),
		remix({
			future: {
				v3_fetcherPersist: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true,
				v3_singleFetch: true,
				v3_lazyRouteDiscovery: true,
			},
			ignoredRouteFiles: ["**/*"],
			routes: async (defineRoutes) => {
				return flatRoutes("routes", defineRoutes, {
					ignoredRouteFiles: ["**/*.test.{js,jsx,ts,tsx}"],
				});
			},
		}),
		tsconfigPaths(),
		sentryVitePlugin({
			org: "reimei",
			project: "evame",
			url: "https://sentry.io/",
			sourcemaps: {
				filesToDeleteAfterUpload: "true",
			},
		}),
	],
});
