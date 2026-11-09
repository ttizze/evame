import assert from "node:assert/strict";
import { chromium, expect, webkit } from "@playwright/test";
import { checkEditorLists } from "./check-editor-lists.mjs";

/** 保存の応答を返す場合も、マウスを離すまで実際のドラッグを保つ。 */
async function beginDrag(page, start, destination) {
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(destination.x, destination.y, { steps: 12 });
	// WebKitでもdropが届くよう、公式手順に合わせて終点へ2回移動する。
	await page.mouse.move(destination.x, destination.y);
}

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
			const sessionCookie = {
				name: cookie.slice(0, separator),
				value: cookie.slice(separator + 1),
				url: baseUrl,
				httpOnly: true,
				sameSite: "Lax",
			};
			await context.addCookies([sessionCookie]);
			const page = await context.newPage();
			await page.goto(`${baseUrl}/ja`);
			await page.getByRole("button", { name: "Create a new page" }).click();
			await page.waitForURL(/\/edit$/);
			const title = page.getByTestId("title-input");
			const editor = page.getByTestId("lexical-editor");
			for (const width of [390, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				const row = await editor.locator("p").boundingBox();
				const placeholder = await page
					.getByText("本文を書く…", { exact: true })
					.boundingBox();
				assert.ok(row && placeholder);
				assert.equal(
					placeholder.x,
					row.x,
					"本文の案内文を空行のカーソル位置へ揃える",
				);
				assert.equal(
					placeholder.y,
					row.y,
					"本文の案内文を空行のカーソル位置へ揃える",
				);
			}
			const finishSave = Promise.withResolvers();
			let saveStarted = false;
			let interceptSave = true;
			const loaderRequests = [];
			page.on("request", (request) => {
				if (
					request.method() === "GET" &&
					new URL(request.url()).pathname.startsWith("/_serverFn/")
				)
					loaderRequests.push(new URL(request.url()).pathname);
			});
			await context.route(`${baseUrl}/_serverFn/**`, async (route) => {
				if (interceptSave && route.request().method() === "POST") {
					interceptSave = false;
					const response = await route.fetch();
					saveStarted = true;
					await finishSave.promise;
					await route.fulfill({ response });
				} else await route.continue();
			});
			await title.fill("段落のドラッグ移動");
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
			// 保存の応答をドラッグ中に返しても、画面を再取得せず操作を続けられる。
			await expect.poll(() => saveStarted, { timeout: 20000 }).toBe(true);
			const editable = await editor.elementHandle();
			await editor.locator("p").first().hover();
			const savingHandle = await page
				.getByTestId("editor-drag-handle")
				.boundingBox();
			const savingTarget = await editor.locator("p").nth(1).boundingBox();
			assert.ok(editable && savingHandle && savingTarget);
			await beginDrag(
				page,
				{
					x: savingHandle.x + savingHandle.width / 2,
					y: savingHandle.y + savingHandle.height / 2,
				},
				{ x: savingTarget.x + 10, y: savingTarget.y + savingTarget.height - 2 },
			);
			finishSave.resolve();
			await expect(page.getByTestId("save-button-check")).toBeVisible({
				timeout: 20000,
			});
			assert.deepEqual(
				loaderRequests,
				[],
				"自動保存で編集画面や親ルートを再取得しない",
			);
			assert.equal(
				await editable.evaluate((element) => element.isConnected),
				true,
			);
			await expect(page.getByRole("combobox")).toBeEnabled();
			await page.mouse.up();
			await expect(editor.locator("p").first()).toHaveText("次の段落");
			await editor.press("ControlOrMeta+z");
			await expect(editor.locator("p").first()).toHaveText("最初の段落");
			for (const destination of [title, page.getByRole("combobox")]) {
				const originalValue = await destination.inputValue();
				await editor.locator("p").first().hover();
				const start = await page
					.getByTestId("editor-drag-handle")
					.boundingBox();
				const target = await destination.boundingBox();
				assert.ok(start && target);
				await beginDrag(
					page,
					{ x: start.x + start.width / 2, y: start.y + start.height / 2 },
					{ x: target.x + target.width / 2, y: target.y + target.height / 2 },
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
				await beginDrag(
					page,
					{ x: handleX, y: start.y + start.height / 2 },
					{
						x: dropInGutter ? handleX : destination.x + 10,
						y: destination.y + destination.height - 2,
					},
				);
				await expect
					.poll(() =>
						page
							.getByTestId("editor-drop-line")
							.evaluate((element) => Number(getComputedStyle(element).opacity)),
					)
					.toBeGreaterThan(0);
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
			await beginDrag(
				page,
				{
					x: imageHandle.x + imageHandle.width / 2,
					y: imageHandle.y + imageHandle.height / 2,
				},
				{ x: imageTarget.x + 10, y: imageTarget.y + imageTarget.height - 2 },
			);
			await page.mouse.up();
			await expect(
				editor.locator("p").nth(1).getByRole("img", { name: "移動する画像" }),
			).toBeVisible();
			await expect(page.getByTestId("save-button-check")).toBeVisible({
				timeout: 20000,
			});
			const editUrl = page.url();
			// 自動保存で認証が切れてログインへ移っても、戻ったときは保存済みの最新版を読む。
			await context.clearCookies();
			await title.fill("セッション切れの追加入力");
			await page.waitForURL(/\/ja\/auth\/login$/, { timeout: 20000 });
			await expect(page.locator('input[type="email"]')).toBeVisible();
			await context.addCookies([sessionCookie]);
			await page.goBack();
			await expect(page).toHaveURL(editUrl);
			await expect(title).toHaveValue("段落のドラッグ移動");
			await expect(editor.locator("p")).toHaveText([
				"次の段落",
				"",
				"最初の段落",
				"最後の段落",
			]);
			await expect(page.getByRole("combobox")).toBeEnabled();
			await page.getByRole("button", { name: "Private", exact: true }).click();
			await page.getByRole("link", { name: "Preview", exact: true }).click();
			await page.waitForURL(editUrl.replace(/\/edit$/, ""));
			await expect(
				page.getByRole("link", { name: "Edit page", exact: true }),
			).toBeVisible();
			await page.goBack();
			await expect(page).toHaveURL(editUrl);
			await expect(title).toHaveValue("段落のドラッグ移動");
			await expect(editor.locator("p")).toHaveText([
				"次の段落",
				"",
				"最初の段落",
				"最後の段落",
			]);
			await expect(page.getByRole("combobox")).toBeEnabled();
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
			// 先頭・末尾の余白も本文と同じドロップ先として扱う。
			for (const moveToStart of [true, false]) {
				const originalOrder = moveToStart
					? ["次の段落", "", "最初の段落", "最後の段落"]
					: ["最後の段落", "次の段落", "", "最初の段落"];
				const movedOrder = moveToStart
					? ["最後の段落", "次の段落", "", "最初の段落"]
					: ["次の段落", "", "最初の段落", "最後の段落"];
				for (const dropInGutter of [false, true]) {
					await (moveToStart
						? editor.locator("p").last()
						: editor.locator("p").first()
					).hover();
					const start = await page
						.getByTestId("editor-drag-handle")
						.boundingBox();
					const target = await (moveToStart
						? editor.locator("p").first()
						: editor.locator("p").last()
					).boundingBox();
					assert.ok(start && target);
					const handleX = start.x + start.width / 2;
					await beginDrag(
						page,
						{ x: handleX, y: start.y + start.height / 2 },
						{
							x: dropInGutter ? handleX : target.x + 10,
							y: moveToStart ? target.y - 6 : target.y + target.height + 6,
						},
					);
					await page.mouse.up();
					await expect(editor.locator("p")).toHaveText(movedOrder);
					await editor.press("ControlOrMeta+z");
					await expect(editor.locator("p")).toHaveText(originalOrder);
				}
				await editor.press("ControlOrMeta+Shift+z");
				await expect(editor.locator("p")).toHaveText(movedOrder);
				await expect(page.getByTestId("save-button-check")).toBeVisible({
					timeout: 20000,
				});
				await page.reload();
				await expect(editor.locator("p")).toHaveText(movedOrder);
			}
			console.log(
				`${browserType.name()}: 自動保存中のドラッグ、本文・左列と先頭・末尾への移動、画像移動、Undo・Redo・保存・再読み込み、タイトル・タグへの誤挿入防止を確認できる`,
			);
			await checkEditorLists(page);
		} finally {
			await browser.close();
		}
	}
}
