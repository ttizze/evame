import assert from "node:assert/strict";
import { checkEditorDrag } from "./check-editor-drag.mjs";
import { checkEditorLists } from "./check-editor-lists.mjs";

export async function checkEditorBrowser(baseUrl, cookie, browserTypes, suite) {
	const suites = [
		"editor-drag",
		"editor-lists-clipboard",
		"editor-lists-structure",
		"editor-lists-formatting",
	];
	assert.ok(
		suite === "all" || suites.includes(suite),
		`Unknown editor suite: ${suite}`,
	);
	for (const browserType of browserTypes) {
		const browser = await browserType.launch();
		try {
			for (const selected of suite === "all" ? suites : [suite]) {
				const context = await browser.newContext({
					viewport: { width: 1280, height: 900 },
				});
				try {
					await context.route("**/*", (route) =>
						new URL(route.request().url()).origin === baseUrl
							? route.continue()
							: route.abort(),
					);
					await context.route(`${baseUrl}/editor-drag-image.svg`, (route) =>
						route.fulfill({
							contentType: "image/svg+xml",
							body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="blue"/></svg>',
						}),
					);
					const separator = cookie.indexOf("=");
					await context.addCookies([
						{
							name: cookie.slice(0, separator),
							value: cookie.slice(separator + 1),
							url: baseUrl,
							httpOnly: true,
							sameSite: "Lax",
						},
					]);
					const page = await context.newPage();
					await page.goto(`${baseUrl}/ja`);
					await page.getByRole("button", { name: "Create a new page" }).click();
					await page.waitForURL(/\/edit$/);
					if (selected === "editor-drag") await checkEditorDrag(page);
					else {
						await page.getByTestId("title-input").fill("リスト操作の検証");
						await checkEditorLists(
							page,
							selected.slice("editor-lists-".length),
						);
					}
					console.log(
						`${browserType.name()}: ${selected} の保存・再読み込み・Undo/Redoまで確認できる`,
					);
				} finally {
					await context.close();
				}
			}
		} finally {
			await browser.close();
		}
	}
}
