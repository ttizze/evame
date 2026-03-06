import withBundleAnalyzer from "@next/bundle-analyzer";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const analyzeBundles = withBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});
/** @type {import('next').NextConfig} */
const config: NextConfig = {
	serverExternalPackages: ["pino"],
	// ローカルで本番相当の Performance を見たいとき用。
	// `PRODUCTION_BROWSER_SOURCEMAPS=true` で build すると、DevTools から呼び出し元が追えるようになる。
	// (bundle サイズが増えるので常時 ON は非推奨)
	productionBrowserSourceMaps:
		process.env.PRODUCTION_BROWSER_SOURCEMAPS === "true",
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
	cacheComponents: true,
	typedRoutes: true,
	images: {
		minimumCacheTTL: 2_678_400,
		loader: "custom",
		loaderFile: "./src/app/_service/cloudflare-loader.ts",

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
			{
				protocol: "https",
				hostname: "flagcdn.com",
				port: "",
				pathname: "/**",
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
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
};

export default analyzeBundles(withNextIntl(config));

initOpenNextCloudflareForDev();
