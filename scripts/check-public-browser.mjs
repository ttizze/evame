import assert from "node:assert/strict";
import { checkArticleBrowser } from "./check-article-browser.mjs";
import { checkHeaderBrowser } from "./check-header-browser.mjs";

export async function checkPublicBrowser(
	browserTypes,
	suite,
	baseUrl,
	cookie,
	handle,
	pageSlug,
) {
	assert.ok(
		["header", "article"].includes(suite),
		`Unknown public suite: ${suite}`,
	);
	for (const engine of browserTypes) {
		const browser = await engine.launch();
		try {
			if (suite === "header") {
				await checkHeaderBrowser(browser, baseUrl, cookie, handle, pageSlug);
			} else {
				await checkArticleBrowser(browser, baseUrl, cookie, handle, pageSlug);
			}
		} finally {
			await browser.close();
		}
	}
}
