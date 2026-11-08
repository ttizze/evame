import assert from "node:assert/strict";
import { chromium, expect, webkit } from "@playwright/test";

/** 本文とハンドル列の両方へ、実際のマウス操作でブロックを移動する。 */
export async function checkEditorDrag(baseUrl, cookie) {
	for (const browserType of [chromium, webkit]) {
		const browser = await browserType.launch();
		try {
			const context = await browser.newContext({
				viewport: { width: 1280, height: 900 },
			});
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
			const title = page.getByTestId("title-input");
			await title.fill("段落のドラッグ移動");
			const editor = page.getByTestId("lexical-editor");
			await editor.click();
			await editor.evaluate((element) => {
				const data = new DataTransfer();
				data.setData(
					"text/plain",
					"**最初の段落**\n\n次の段落\n\n最後の段落\n\n![移動する画像](/editor-drag-image.svg)",
				);
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: data,
						bubbles: true,
						cancelable: true,
					}),
				);
			});
			await expect(editor.locator("p")).toHaveCount(4);
			for (const destination of [title, page.getByRole("combobox")]) {
				const originalValue = await destination.inputValue();
				await editor.locator("p").first().hover();
				const start = await page
					.getByTestId("editor-drag-handle")
					.boundingBox();
				const target = await destination.boundingBox();
				assert.ok(start && target);
				await page.mouse.move(
					start.x + start.width / 2,
					start.y + start.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					target.x + target.width / 2,
					target.y + target.height / 2,
					{ steps: 12 },
				);
				await page.mouse.up();
				await expect(destination).toHaveValue(originalValue);
				await expect(editor.locator("p").first()).toHaveText("最初の段落");
			}
			for (const dropInGutter of [false, true]) {
				await editor.locator("p").first().hover();
				const handle = page.getByTestId("editor-drag-handle");
				await expect(handle).toBeVisible();
				const start = await handle.boundingBox();
				const destination = await editor.locator("p").nth(1).boundingBox();
				assert.ok(start && destination);
				const handleX = start.x + start.width / 2;
				await page.mouse.move(handleX, start.y + start.height / 2);
				await page.mouse.down();
				await page.mouse.move(
					dropInGutter ? handleX : destination.x + 10,
					destination.y + destination.height - 2,
					{ steps: 12 },
				);
				await expect(page.getByTestId("editor-drop-line")).toHaveCSS(
					"opacity",
					"0.4",
				);
				await page.mouse.up();
				await expect(editor.locator("p").first()).toHaveText("次の段落");
				await editor.press("ControlOrMeta+z");
				await expect(editor.locator("p").first()).toHaveText("最初の段落");
			}
			await editor.press("ControlOrMeta+Shift+z");
			await expect(editor.locator("p").first()).toHaveText("次の段落");
			const imageBlock = editor.locator("p").last();
			await expect(
				imageBlock.getByRole("img", { name: "移動する画像" }),
			).toBeVisible();
			await imageBlock.hover();
			const imageHandle = await page
				.getByTestId("editor-drag-handle")
				.boundingBox();
			const imageTarget = await editor.locator("p").first().boundingBox();
			assert.ok(imageHandle && imageTarget);
			await page.mouse.move(
				imageHandle.x + imageHandle.width / 2,
				imageHandle.y + imageHandle.height / 2,
			);
			await page.mouse.down();
			await page.mouse.move(
				imageTarget.x + 10,
				imageTarget.y + imageTarget.height - 2,
				{ steps: 12 },
			);
			await page.mouse.up();
			await expect(
				editor.locator("p").nth(1).getByRole("img", { name: "移動する画像" }),
			).toBeVisible();
			await expect(page.getByTestId("save-button-check")).toBeVisible({
				timeout: 20000,
			});
			await page.reload();
			await expect(editor.locator("p")).toHaveText([
				"次の段落",
				"",
				"最初の段落",
				"最後の段落",
			]);
			await expect(editor.locator("strong")).toHaveText("最初の段落");
			await expect(
				editor.locator("p").nth(1).getByRole("img", { name: "移動する画像" }),
			).toHaveAttribute("src", "/editor-drag-image.svg");
			await expect(title).toHaveValue("段落のドラッグ移動");
			await expect(page.getByTestId("tags-input")).toHaveValue("[]");
			console.log(
				`${browserType.name()}: 本文・左列への段落移動、画像移動、Undo・Redo・保存・再読み込み、タイトル・タグへの誤挿入防止を確認できる`,
			);
		} finally {
			await browser.close();
		}
	}
}
