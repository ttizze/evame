import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function checkEditorArticle(page) {
	await expect(page.getByTestId("save-button-check")).toBeVisible({
		timeout: 20000,
	});
	await page.getByRole("link", { name: "Evame Logo", exact: true }).click();
	await page.getByRole("button", { name: "Create a new page" }).click();
	await page.waitForURL(/\/edit$/);
	const editor = page.getByTestId("lexical-editor");
	const title = page.getByTestId("title-input");
	const body = editor.locator(":scope > p");
	const markdown = page.locator('input[name="pageContent"]');
	const titleValue = page.locator('input[name="title"]');
	const saved = page.getByTestId("save-button-check");
	const publicationSettings = page.getByRole("button", {
		name: "公開設定: 自分のみ",
		exact: true,
	});
	for (const backward of [false, true]) {
		const originalTitle = backward ? "Title" : "Title ";
		const originalBody = backward ? " Body text" : "Body text";
		await title.fill(originalTitle);
		await body.fill(originalBody);
		await expect(saved).toHaveCount(0);
		await expect(saved).toBeVisible({ timeout: 20000 });
		const target = backward ? body : title;
		await target.evaluate(
			(element, offset) => {
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
				const text = walker.nextNode();
				if (!text) throw new Error("削除する文字がありません");
				window.getSelection().setBaseAndExtent(text, offset, text, offset);
			},
			backward ? 1 : 5,
		);
		await page.keyboard.press(
			backward ? "Control+Backspace" : "Control+Delete",
		);
		await expect(titleValue, "単語削除で本文を題名へ結合しない").toHaveValue(
			"Title",
		);
		await expect(body).toHaveJSProperty("textContent", "Body text");
		await page.keyboard.press("ControlOrMeta+z");
		await expect(titleValue).toHaveValue(originalTitle);
		await expect(body).toHaveJSProperty("textContent", originalBody);
		await page.keyboard.press("ControlOrMeta+Shift+z");
		await expect(titleValue).toHaveValue("Title");
		await expect(body).toHaveJSProperty("textContent", "Body text");
		await expect(saved).toHaveCount(0);
		await expect(saved).toBeVisible({ timeout: 20000 });
		await page.reload();
		await expect(titleValue).toHaveValue("Title");
		await expect(markdown).toHaveValue("Body text");
	}
	for (const kind of ["paste", "beforeinput"]) {
		for (const backward of [false, true]) {
			await editor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await editor.evaluate((element) => {
				const clipboard = new DataTransfer();
				clipboard.setData(
					"text/plain",
					"Title\n\n\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
				);
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: clipboard,
						bubbles: true,
						cancelable: true,
					}),
				);
			});
			await expect(titleValue).toHaveValue("Title");
			await expect(markdown).toHaveValue(
				"\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
			);
			await expect(saved).toHaveCount(0);
			await expect(saved).toBeVisible({ timeout: 20000 });
			await editor.evaluate((element, backward) => {
				const titleText = document
					.createTreeWalker(element.children[0], NodeFilter.SHOW_TEXT)
					.nextNode();
				const codeText = document
					.createTreeWalker(element.children[1], NodeFilter.SHOW_TEXT)
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
				.toBe("tleabc");
			await editor.evaluate((element, kind) => {
				const clipboard = new DataTransfer();
				clipboard.setData("text/plain", "X");
				const event =
					kind === "paste"
						? new ClipboardEvent("paste", {
								clipboardData: clipboard,
								bubbles: true,
								cancelable: true,
							})
						: new InputEvent("beforeinput", {
								inputType: "insertFromPaste",
								bubbles: true,
								cancelable: true,
							});
				if (kind === "beforeinput")
					Object.defineProperty(event, "dataTransfer", { value: clipboard });
				element.dispatchEvent(event);
			}, kind);
			await expect(
				titleValue,
				`${kind}で選択外の本文をタイトルへ取り込まない`,
			).toHaveValue("TiX");
			await expect(markdown).toHaveValue(
				"\x60\x60\x60\ndef\n\x60\x60\x60\n\nlast",
			);
			await page.keyboard.press("ControlOrMeta+z");
			await expect(titleValue).toHaveValue("Title");
			await expect(markdown).toHaveValue(
				"\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
			);
			await page.keyboard.press("ControlOrMeta+Shift+z");
			await expect(titleValue).toHaveValue("TiX");
			await expect(markdown).toHaveValue(
				"\x60\x60\x60\ndef\n\x60\x60\x60\n\nlast",
			);
			await expect(saved).toHaveCount(0);
			await expect(saved).toBeVisible({ timeout: 20000 });
			await page.reload();
			await expect(titleValue).toHaveValue("TiX");
			await expect(markdown).toHaveValue(
				"\x60\x60\x60\ndef\n\x60\x60\x60\n\nlast",
			);
		}
	}
	await editor.click();
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.insertText("Title");
	await title.click();
	await page.keyboard.press("Enter");
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await expect(
			page.locator('[contenteditable="true"]'),
			"タイトルと本文を1つのcontentEditableで編集する",
		).toHaveCount(1);
		await expect(editor).toHaveAttribute("contenteditable", "true");
		await expect(editor.locator(":scope > h1")).toHaveCount(1);
		await expect(editor.locator(":scope > :first-child")).toHaveAttribute(
			"data-testid",
			"title-input",
		);
		await expect(title).toHaveJSProperty("tagName", "H1");
		await expect(title).toBeVisible();
		await expect(body).toHaveCount(1);
		await expect(body).toBeVisible();
		assert.equal(
			await title.evaluate(
				(element) =>
					element.isContentEditable &&
					element.parentElement?.dataset.testid === "lexical-editor",
			),
			true,
			"タイトルH1を本文と同じ編集領域の先頭に置く",
		);
	}
	await body.fill("");
	await expect(markdown).toHaveValue("");
	await title.fill("");
	await expect(titleValue).toHaveValue("");
	await title.click();
	await page.keyboard.press("Enter");
	await expect
		.poll(() =>
			editor.evaluate((element) => {
				const anchor = window.getSelection()?.anchorNode;
				return anchor && element.querySelector(":scope > p")?.contains(anchor);
			}),
		)
		.toBe(true);
	let expectedBody = "空のタイトルから書いた本文";
	await page.keyboard.insertText(expectedBody);
	await expect(title, "空のタイトルのReturnで本文へ移動する").toHaveText("");
	await expect(body).toHaveText([expectedBody]);
	await expect(titleValue).toHaveValue("");
	await expect(markdown).toHaveValue(expectedBody);
	await expect(saved).toHaveCount(0);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(title, "空のタイトルをuntitledとして保存する").toHaveText(
		"untitled",
	);
	await expect(titleValue).toHaveValue("untitled");
	await expect(body).toHaveText([expectedBody]);
	const savedMarkdown = await markdown.inputValue();
	const expectedTitle = "題名だけを自動保存";
	await title.fill(expectedTitle);
	await expect(saved, "タイトルだけの変更も未保存として扱う").toHaveCount(0);
	await expect(markdown).toHaveValue(savedMarkdown);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(title, "本文を変更せずタイトルだけを自動保存する").toHaveText(
		expectedTitle,
	);
	await expect(titleValue).toHaveValue(expectedTitle);
	await expect(markdown).toHaveValue(savedMarkdown);
	await expect(body).toHaveText([expectedBody]);
	for (const [key, prefix] of [
		["Enter", "Returnから入力。"],
		["Shift+Enter", "ShiftReturnから入力。"],
	]) {
		await title.click();
		await title.evaluate((element) => {
			const text = document
				.createTreeWalker(element, NodeFilter.SHOW_TEXT)
				.nextNode();
			if (!text) throw new Error("タイトルの選択対象がありません");
			window.getSelection().setPosition(text, 2);
		});
		await page.keyboard.press(key);
		await page.keyboard.insertText(prefix);
		await expect(title, `${key}でタイトルを途中から分割しない`).toHaveText(
			expectedTitle,
		);
		await expect(body).toHaveText([`${prefix}${expectedBody}`]);
		await expect(editor.locator(":scope > h1")).toHaveCount(1);
		await page.keyboard.press("ControlOrMeta+z");
		await expect(title).toHaveText(expectedTitle);
		await expect(body, `${key}後の本文入力をUndoできる`).toHaveText([
			expectedBody,
		]);
		await page.keyboard.press("ControlOrMeta+Shift+z");
		expectedBody = `${prefix}${expectedBody}`;
		await expect(body, `${key}後の本文入力をRedoできる`).toHaveText([
			expectedBody,
		]);
		await expect(saved).toHaveCount(0);
		await expect(saved).toBeVisible({ timeout: 20000 });
		await page.reload();
		await expect(title).toHaveText(expectedTitle);
		await expect(body).toHaveText([expectedBody]);
		await expect(markdown).toHaveValue(expectedBody);
	}
	await title.click();
	await title.evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(false);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});
	await page.keyboard.press("Delete");
	await expect(title, "タイトル末尾のDeleteで本文と結合しない").toHaveText(
		expectedTitle,
	);
	await expect(body).toHaveText([expectedBody]);
	await body.first().click();
	await body.first().evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(true);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});
	await page.keyboard.press("Backspace");
	await expect(title, "本文先頭のBackspaceでタイトルを削除しない").toHaveText(
		expectedTitle,
	);
	await expect(body).toHaveText([expectedBody]);
	await expect
		.poll(() =>
			title.evaluate((element) =>
				element.contains(window.getSelection()?.anchorNode ?? null),
			),
		)
		.toBe(true);
	await page.keyboard.press("ControlOrMeta+b");
	await page.keyboard.insertText("固定");
	const fixedTitle = `${expectedTitle}固定`;
	await expect(title, "タイトルへの太字操作でもH1の種類を保つ").toHaveText(
		fixedTitle,
	);
	await expect(title.locator("strong, b, em, i, code, a")).toHaveCount(0);
	await expect(editor.locator(":scope > h1")).toHaveCount(1);
	await expect(editor.locator(":scope > :first-child")).toHaveAttribute(
		"data-testid",
		"title-input",
	);
	await expect(body).toHaveText([expectedBody]);
	await expect(markdown).toHaveValue(expectedBody);
	await expect(saved).toHaveCount(0);
	await expect(saved).toBeVisible({ timeout: 20000 });
	await page.reload();
	await expect(title).toHaveText(fixedTitle);
	await expect(title).toHaveJSProperty("tagName", "H1");
	await expect(body).toHaveText([expectedBody]);
	await title.hover();
	await expect(
		page.getByTestId("editor-drag-handle"),
		"タイトルH1をドラッグ移動の対象にしない",
	).toBeHidden();
	await page.setViewportSize({ width: 390, height: 900 });
	const tagInput = page.getByRole("combobox", { name: "タグ", exact: true });
	const tags = page.getByRole("group", { name: "タグ", exact: true });
	const settingsMenu = page.getByRole("dialog", {
		name: "公開設定",
		exact: true,
	});
	await expect(tagInput, "公開メニューの外にタグ入力を表示しない").toHaveCount(
		0,
	);
	await expect(tags).toHaveCount(0);
	await publicationSettings.click();
	await expect(settingsMenu).toBeVisible();
	await expect(
		settingsMenu.getByRole("group", { name: "タグ", exact: true }),
	).toHaveCount(1);
	await expect(tagInput).toBeEnabled();
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
	await expect(page.getByText("タグを保存中…", { exact: true })).toHaveCount(0);
	await expect(settingsMenu.getByRole("alert")).toHaveCount(0);
	await expect(title).toHaveText(fixedTitle);
	await expect(body).toHaveText([expectedBody]);
	await expect(markdown).toHaveValue(expectedBody);
	await expect(publicationSettings).toHaveAttribute("aria-expanded", "true");
	await publicationSettings.click();
	await expect(tagInput).toHaveCount(0);
	await expect(tags).toHaveCount(0);
	await page.reload();
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(title).toHaveText(fixedTitle);
	await expect(body).toHaveText([expectedBody]);
	await expect(markdown).toHaveValue(expectedBody);
	await expect(page.locator('[contenteditable="true"]')).toHaveCount(1);
	await expect(tagInput).toHaveCount(0);
	await expect(tags).toHaveCount(0);
	await publicationSettings.click();
	await expect(
		removeTag,
		"タグを保存して再読み込み後も再表示する",
	).toBeEnabled();
	await expect(tagInput).toBeEnabled();
	await expect(publicationSettings).toHaveText("自分のみ");
	await publicationSettings.click();
	await expect(tags).toHaveCount(0);
	console.log(
		"単一contentEditable、固定H1、タイトルのReturn・Shift+Return、空タイトルのuntitled保存、タイトルだけの自動保存、公開メニュー内のタグ保存・再表示を確認できる",
	);
}
