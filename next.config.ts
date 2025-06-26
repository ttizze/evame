import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const analyzeBundles = withBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});
/** @type {import('next').NextConfig} */
const config: NextConfig = {
	eslint: {
		// Warning: This allows production builds to successfully complete even if
		// your project has ESLint errors.
		ignoreDuringBuilds: true,
	},
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "5mb",
		},
	},
	images: {
		minimumCacheTTL: 86400,
		loader: "custom",
		loaderFile: "./src/lib/cloudflare-loader.ts",

		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.eveeve.org",
				port: "",
				pathname: "/uploads/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "images.evame.tech",
				port: "",
				pathname: "/cdn-cgi/image/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "evame.tech",
				port: "",
				pathname: "/api/og",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
				port: "",
				pathname: "/a/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
				port: "",
				pathname: "/u/**",
				search: "",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "9000",
				pathname: "/evame/uploads/**",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "3000",
				pathname: "/api/og",
			},
		],
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
				],
			},
		];
	},
};

export default analyzeBundles(
	withSentryConfig(withNextIntl(config), {
		// For all available options, see:
		// https://github.com/getsentry/sentry-webpack-plugin#options

		org: "reimei",
		project: "evame-vercel",

		// Only print logs for uploading source maps in CI
		silent: !process.env.CI,

		// For all available options, see:
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		// Automatically annotate React components to show their full name in breadcrumbs and session replay
		reactComponentAnnotation: {
			enabled: true,
		},

		// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
		// This can increase your server load as well as your hosting bill.
		// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
		// side errors will fail.
		tunnelRoute: "/monitoring",

		// Automatically tree-shake Sentry logger statements to reduce bundle size
		disableLogger: true,

		// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
		// See the following for more information:
		// https://docs.sentry.io/product/crons/
		// https://vercel.com/docs/cron-jobs
		automaticVercelMonitors: true,
	}),
);
