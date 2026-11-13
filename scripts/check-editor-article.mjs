import { expect } from "@playwright/test";

export async function checkEditorArticle(page) {
	await expect(page.getByTestId("save-button-check")).toBeVisible({
		timeout: 20000,
	});
	await page.getByRole("link", { name: "Evame Logo", exact: true }).click();
	await page.getByRole("button", { name: "Create a new page" }).click();
	await page.waitForURL(/\/edit$/);
	const editor = page.getByTestId("lexical-editor");
	const title = editor.locator(":scope > h1:first-child");
	const body = editor.locator(":scope > p");
	const markdown = page.locator('input[name="pageContent"]');
	const titleValue = page.locator('input[name="title"]');
	const saved = page.getByTestId("save-button-check");
	const settings = page.getByRole("button", {
		name: "公開設定: 自分のみ",
		exact: true,
	});
	async function replaceArticle(content, format) {
		await editor.focus();
		await page.keyboard.press("ControlOrMeta+a");
		await editor.evaluate(
			(element, { content, format }) => {
				const clipboard = new DataTransfer();
				clipboard.setData(format, content);
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: clipboard,
						bubbles: true,
						cancelable: true,
					}),
				);
			},
			{ content, format },
		);
		await expect(title).toHaveCount(1);
	}
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await expect(page.locator('[contenteditable="true"]')).toHaveCount(1);
		await expect(title).toBeVisible();
		await expect(title).toHaveJSProperty("tagName", "H1");
	}
	await replaceArticle("<h1>Title</h1><p>Body</p>", "text/html");
	await title.evaluate((element) => {
		const selection = window.getSelection();
		selection.selectAllChildren(element);
		selection.collapseToEnd();
	});
	await page.keyboard.press("Enter");
	await page.keyboard.insertText("新しい本文");
	await expect(titleValue).toHaveValue("Title");
	await expect(body).toHaveText(["新しい本文", "Body"]);
	await expect(markdown).toHaveValue("新しい本文\n\nBody");
	await expect(saved).toHaveCount(0);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(body).toHaveText(["新しい本文", "Body"]);
	const unchangedBody = await markdown.inputValue();
	await title.fill("題名だけを自動保存");
	await expect(saved).toHaveCount(0);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(titleValue).toHaveValue("題名だけを自動保存");
	await expect(markdown).toHaveValue(unchangedBody);
	for (const empty of ["", "  "]) {
		await title.fill(empty);
		await expect(titleValue).toHaveValue(empty);
		await expect(saved).toHaveCount(0);
		await expect(saved).toBeVisible({ timeout: 20000 });
		await page.reload();
		await expect(titleValue).toHaveValue("untitled");
		await expect(markdown).toHaveValue(unchangedBody);
	}
	for (const backward of [false, true]) {
		await replaceArticle("<h1>Title</h1><p>Body</p>", "text/html");
		await expect(titleValue).toHaveValue("Title");
		await expect(body).toHaveText(["Body"]);
		const target = backward ? body : title;
		await target.evaluate((element, backward) => {
			const selection = window.getSelection();
			selection.selectAllChildren(element);
			if (backward) selection.collapseToStart();
			else selection.collapseToEnd();
		}, backward);
		await page.keyboard.press(backward ? "Backspace" : "Delete");
		await expect(titleValue, "タイトルと本文の結合を標準へ任せる").toHaveValue(
			"TitleBody",
		);
		await expect(markdown).toHaveValue("");
		await page.keyboard.press("ControlOrMeta+z");
		await expect(titleValue).toHaveValue("Title");
		await expect(markdown).toHaveValue("Body");
		await page.keyboard.press("ControlOrMeta+Shift+z");
		await expect(titleValue).toHaveValue("TitleBody");
		await expect(markdown).toHaveValue("");
		await expect(saved).toHaveCount(0);
		await expect(saved).toBeVisible({ timeout: 20000 });
		await page.reload();
		await expect(titleValue).toHaveValue("TitleBody");
		await expect(markdown).toHaveValue("");
	}
	for (const kind of ["paste", "paste-beforeinput"]) {
		for (const backward of [false, true]) {
			await replaceArticle(
				"Title\n\nleading\n\n\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
				"text/plain",
			);
			await expect(titleValue).toHaveValue("Title");
			const originalMarkdown = await markdown.inputValue();
			await editor.evaluate((element, backward) => {
				const titleText = document
					.createTreeWalker(element.children[0], NodeFilter.SHOW_TEXT)
					.nextNode();
				const codeText = document
					.createTreeWalker(element.children[2], NodeFilter.SHOW_TEXT)
					.nextNode();
				if (!titleText || !codeText)
					throw new Error("貼り付け対象がありません");
				window
					.getSelection()
					.setBaseAndExtent(
						backward ? codeText : titleText,
						backward ? 3 : 2,
						backward ? titleText : codeText,
						backward ? 2 : 3,
					);
			}, backward);
			await expect
				.poll(() =>
					page.evaluate(() =>
						window.getSelection().toString().replace(/\n/g, ""),
					),
				)
				.toBe("tleleadingabc");
			await editor.evaluate((element, kind) => {
				const clipboard = new DataTransfer();
				clipboard.setData("text/plain", "X");
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: clipboard,
						bubbles: true,
						cancelable: true,
					}),
				);
				if (kind === "paste-beforeinput") {
					const input = new InputEvent("beforeinput", {
						inputType: "insertFromPaste",
						bubbles: true,
						cancelable: true,
					});
					Object.defineProperty(input, "dataTransfer", { value: clipboard });
					element.dispatchEvent(input);
				}
			}, kind);
			await expect(titleValue, kind).toHaveValue("TiXdef");
			await expect(markdown).toHaveValue("last");
			await page.keyboard.press("ControlOrMeta+z");
			await expect(titleValue).toHaveValue("Title");
			await expect(markdown).toHaveValue(originalMarkdown);
			await page.keyboard.press("ControlOrMeta+Shift+z");
			await expect(titleValue).toHaveValue("TiXdef");
			await expect(markdown).toHaveValue("last");
			await expect(saved).toHaveCount(0);
			await expect(saved).toBeVisible({ timeout: 20000 });
			await page.reload();
			await expect(titleValue).toHaveValue("TiXdef");
			await expect(markdown).toHaveValue("last");
		}
	}
	for (const bodyOnly of [false, true]) {
		for (const backward of [false, true]) {
			await replaceArticle("<h1>Title</h1><p>oldA</p><p>oldB</p>", "text/html");
			await expect(markdown).toHaveValue("oldA\n\noldB");
			await editor.evaluate(
				(element, { bodyOnly, backward }) => {
					const start = bodyOnly ? 1 : 0;
					window
						.getSelection()
						.setBaseAndExtent(
							element,
							backward ? element.children.length : start,
							element,
							backward ? start : element.children.length,
						);
				},
				{ bodyOnly, backward },
			);
			await expect
				.poll(() =>
					editor.evaluate(
						(element) => window.getSelection().anchorNode === element,
					),
				)
				.toBe(true);
			await editor.evaluate((element) => {
				const clipboard = new DataTransfer();
				clipboard.setData(
					"text/html",
					"<strong>A</strong><em>B</em><p>block</p><strong>C</strong><em>D</em>",
				);
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: clipboard,
						bubbles: true,
						cancelable: true,
					}),
				);
			});
			const expectedTitle = bodyOnly ? "Title" : "AB";
			const expectedBody = bodyOnly ? ["AB", "block", "CD"] : ["block", "CD"];
			await expect(titleValue).toHaveValue(expectedTitle);
			await expect(body).toHaveText(expectedBody);
			await page.keyboard.press("ControlOrMeta+z");
			await expect(titleValue).toHaveValue("Title");
			await expect(markdown).toHaveValue("oldA\n\noldB");
			await page.keyboard.press("ControlOrMeta+Shift+z");
			await expect(titleValue).toHaveValue(expectedTitle);
			await expect(body).toHaveText(expectedBody);
			await expect(saved).toHaveCount(0);
			await expect(saved).toBeVisible({ timeout: 20000 });
			await page.reload();
			await expect(titleValue).toHaveValue(expectedTitle);
			await expect(body).toHaveText(expectedBody);
			await expect(body.locator("strong")).toHaveText(
				bodyOnly ? ["A", "C"] : ["C"],
			);
			await expect(body.locator("em")).toHaveText(
				bodyOnly ? ["B", "D"] : ["D"],
			);
		}
	}
	await page.setViewportSize({ width: 390, height: 900 });
	const imageUrl = new URL("/logo.png", page.url()).href;
	await replaceArticle(
		`<h1>画像入り <a href="https://example.test/picture"><img src="${imageUrl}" alt="写真"></a></h1><p>last</p>`,
		"text/html",
	);
	await expect(titleValue).toHaveValue("");
	await expect(
		editor.getByRole("img", { name: "写真", exact: true }),
	).toHaveCount(1);
	const imageMarkdown = await markdown.inputValue();
	expect(imageMarkdown).toContain(
		`[![写真](${imageUrl})](https://example.test/picture)`,
	);
	await expect(saved).toHaveCount(0);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(titleValue).toHaveValue("untitled");
	await expect(markdown).toHaveValue(imageMarkdown);
	await expect(
		editor.getByRole("img", { name: "写真", exact: true }),
	).toHaveCount(1);
	const originalTitle = await titleValue.inputValue();
	const originalMarkdown = await markdown.inputValue();
	const tagInput = page.getByRole("combobox", { name: "タグ", exact: true });
	const tags = page.getByRole("group", { name: "タグ", exact: true });
	await expect(tags).toHaveCount(0);
	await settings.click();
	const tagName = `記事${Date.now().toString(36)}`;
	const removeTag = tags.getByRole("button", {
		name: `タグ「${tagName}」を削除`,
		exact: true,
	});
	await tagInput.fill(tagName);
	await page
		.getByRole("option", { name: `「${tagName}」を作成`, exact: true })
		.click();
	await expect(removeTag).toBeEnabled({ timeout: 20000 });
	await page.keyboard.press("Escape");
	await expect(tags).toHaveCount(0);
	await settings.click();
	await expect(removeTag).toBeVisible();
	await page.reload();
	await settings.click();
	await expect(removeTag).toBeEnabled();
	await removeTag.click();
	await expect(removeTag).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(titleValue).toHaveValue(originalTitle);
	await expect(markdown).toHaveValue(originalMarkdown);
	console.log(
		"標準のH1・改行・タイトルと本文の結合・装飾付き貼り付けをUndo/Redo・保存再読み込みまで確認し、空タイトルのuntitled保存と公開メニューのタグ操作を確認できる",
	);
}
