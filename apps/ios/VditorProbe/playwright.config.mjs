import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "browser.playwright.mjs",
	workers: 1,
	retries: 0,
	timeout: 60_000,
	outputDir: "../.build/vditor-browser-results",
	reporter: [["list"]],
	use: {
		baseURL: "http://127.0.0.1:4179",
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "chromium", use: { browserName: "chromium" } },
		{
			name: "webkit-iphone",
			use: { ...devices["iPhone 13"], browserName: "webkit" },
		},
	],
	webServer: {
		command: "bun server.mjs",
		url: "http://127.0.0.1:4179",
		reuseExistingServer: false,
	},
});
