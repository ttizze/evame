import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";

function rendered(markdown) {
	const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
	const tree = processor.runSync(processor.parse(markdown));
	removePosition(tree, { force: true });
	return tree;
}

/** 記法の入力、Tabでの階層変更と項目単位のネイティブドラッグを保存後まで確認する。 */
export async function checkEditorLists(page) {
	await page.setViewportSize({ width: 1280, height: 900 });
	const editor = page.getByTestId("lexical-editor");
	async function selectBody() {
		await editor.focus();
		await editor.evaluate((root) => {
			const body = [...root.children].slice(1);
			const range = document.createRange();
			range.setStartBefore(body[0]);
			range.setEndAfter(body[body.length - 1]);
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
		});
	}
	async function replaceMarkdown(markdown) {
		await editor.click();
		await selectBody();
		if (!markdown) await page.keyboard.press("Backspace");
		else
			await editor.evaluate((element, text) => {
				const data = new DataTransfer();
				data.setData("text/plain", text);
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData: data,
						bubbles: true,
						cancelable: true,
					}),
				);
			}, markdown);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(markdown));
	}
	async function selectText(startText, endText, offset) {
		await editor.evaluate(
			(root, { startText, endText, offset }) => {
				const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
				let first = null;
				let last = null;
				while (walker.nextNode()) {
					if (walker.currentNode.textContent === startText)
						first = walker.currentNode;
					if (walker.currentNode.textContent === endText)
						last = walker.currentNode;
				}
				if (!first || !last)
					throw new Error(
						`選択する文字がありません: ${JSON.stringify({ startText, endText, html: root.innerHTML })}`,
					);
				const range = document.createRange();
				range.setStart(first, 0);
				range.setEnd(last, offset ?? last.textContent.length);
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);
			},
			{ startText, endText, offset },
		);
	}
	for (const backward of [false, true]) {
		await replaceMarkdown(
			"- コピー親\n  - **子**\n\n前<br>後\n\n脚注[^n]\n\n[^n]: 注釈",
		);
		const expected = await page
			.locator('input[name="pageContent"]')
			.inputValue();
		await selectBody();
		const copied = await editor.evaluate((root) => {
			const data = new DataTransfer();
			root.dispatchEvent(
				new ClipboardEvent("copy", {
					clipboardData: data,
					bubbles: true,
					cancelable: true,
				}),
			);
			return [...data.types].map((type) => [type, data.getData(type)]);
		});
		assert.ok(
			copied.some(
				([type, value]) => type === "application/x-lexical-editor" && value,
			),
		);
		await replaceMarkdown("- - 入れ子\n\n  元の本文");
		const before = await page.locator('input[name="pageContent"]').inputValue();
		await selectBody();
		if (backward) {
			await editor.evaluate(() => {
				const selection = window.getSelection();
				selection.setBaseAndExtent(
					selection.focusNode,
					selection.focusOffset,
					selection.anchorNode,
					selection.anchorOffset,
				);
			});
		}
		await editor.evaluate((root, copied) => {
			const data = new DataTransfer();
			for (const [type, value] of copied) data.setData(type, value);
			root.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData: data,
					bubbles: true,
					cancelable: true,
				}),
			);
		}, copied);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(expected));
		assert.match(
			await page.locator('input[name="pageContent"]').inputValue(),
			/前<br>後/,
		);
		await editor.press("ControlOrMeta+z");
		await expect(page.locator('input[name="pageContent"]')).toHaveValue(before);
		await editor.press("ControlOrMeta+Shift+z");
		await expect(page.locator('input[name="pageContent"]')).toHaveValue(
			expected,
		);
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(expected));
		assert.match(
			await page.locator('input[name="pageContent"]').inputValue(),
			/前<br>後/,
		);
	}
	await replaceMarkdown("- [ ] &#x20;\n\n  - 子\n\n  親本文");
	const parentCheckbox = editor.getByRole("checkbox");
	await parentCheckbox.click({ position: { x: 8, y: 14 } });
	await expect(parentCheckbox).toHaveAttribute("aria-checked", "true");
	await editor.press("ControlOrMeta+z");
	await expect(parentCheckbox).toHaveAttribute("aria-checked", "false");
	await editor.press("ControlOrMeta+Shift+z");
	await expect(parentCheckbox).toHaveAttribute("aria-checked", "true");
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(parentCheckbox).toHaveAttribute("aria-checked", "true");
	await expect(editor.getByText("親本文", { exact: true })).toBeVisible();
	await expect(editor.getByText("子", { exact: true })).toBeVisible();
	console.log(
		"内部コピーの全文置換と子リストから始まる親のチェック操作を保存・Undo/Redoまで確認した",
	);
	await replaceMarkdown(
		"- [ ] 前\n- [ ] &#x20;\n\n  - [ ] 子\n\n  親本文\n- [ ] 後",
	);
	const checkItems = editor.getByRole("checkbox");
	await expect(checkItems).toHaveCount(4);
	await checkItems.nth(0).focus();
	await page.keyboard.press("ArrowDown");
	await expect(checkItems.nth(1)).toBeFocused();
	await page.keyboard.press("Space");
	await expect(checkItems.nth(1)).toHaveAttribute("aria-checked", "true");
	await expect(checkItems.nth(2)).toHaveAttribute("aria-checked", "false");
	for (const index of [2, 3]) {
		await page.keyboard.press("ArrowDown");
		await expect(checkItems.nth(index)).toBeFocused();
	}
	for (const index of [2, 1, 0]) {
		await page.keyboard.press("ArrowUp");
		await expect(checkItems.nth(index)).toBeFocused();
	}
	await editor.press("ControlOrMeta+z");
	await expect(checkItems.nth(1)).toHaveAttribute("aria-checked", "false");
	await editor.press("ControlOrMeta+Shift+z");
	await expect(checkItems.nth(1)).toHaveAttribute("aria-checked", "true");
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(checkItems.nth(1)).toHaveAttribute("aria-checked", "true");
	await expect(checkItems.nth(2)).toHaveAttribute("aria-checked", "false");
	console.log(
		"親子のチェック項目を上下キーでたどり、Space・Undo/Redo・保存後も状態を保てる",
	);
	await editor.click();
	await selectBody();
	await editor.press("Backspace");
	await editor.pressSequentially("- 親");
	await editor.press("Enter");
	await editor.press("Tab");
	await editor.pressSequentially("1. 子");
	await expect(editor.locator("ul > li > ol > li")).toHaveText("子");
	await editor.press("Enter");
	await editor.press("Tab");
	await editor.pressSequentially("- 孫");
	await expect(editor.locator("ul > li > ol > li > ul > li")).toHaveText("孫");
	await editor.press("Enter");
	await editor.press("Shift+Tab");
	await editor.pressSequentially("次");
	await expect(
		editor.locator("ol > li").filter({ hasText: /^次$/ }),
	).toHaveCount(0);
	// 深さを変えても項目の箇条書きという種類は維持する。
	await expect(
		editor.locator("ul > li > ul > li").filter({ hasText: /^次$/ }),
	).toHaveCount(1);
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(editor.getByText("孫", { exact: true })).toBeVisible();
	assert.deepEqual(
		await editor
			.locator("ul, ol")
			.evaluateAll((elements) =>
				elements.map((element) => getComputedStyle(element).listStyleType),
			),
		["disc", "upper-alpha", "square", "circle"],
	);
	await selectText("子", "子", null);
	await expect
		.poll(() => page.evaluate(() => window.getSelection().toString()))
		.toBe("子");
	await page
		.getByTestId("editor-bubble-menu")
		.getByRole("button", { name: "番号付きリスト", exact: true })
		.click();
	await expect(editor.locator("ol")).toHaveCount(1);
	await expect(editor.getByText("孫", { exact: true })).toBeVisible();
	await editor.press("ArrowRight");
	await editor.locator("li").filter({ hasText: /^子$/ }).hover();
	await page.getByTestId("editor-drag-handle").click();
	await page.getByRole("button", { name: "箇条書き", exact: true }).click();
	await expect(editor.locator("ol")).toHaveCount(0);
	await expect(editor.getByText("孫", { exact: true })).toBeVisible();
	await editor.press("ControlOrMeta+z");
	await expect(editor.locator("ol")).toHaveCount(1);
	await editor.locator("li").filter({ hasText: /^子$/ }).hover();
	await page.getByTestId("editor-drag-handle").click();
	await page
		.getByRole("button", { name: "チェックリスト", exact: true })
		.click();
	const checkbox = editor.getByRole("checkbox");
	await expect(checkbox).toHaveCount(1);
	await checkbox.click({ position: { x: 8, y: 14 } });
	await expect(checkbox).toHaveAttribute("aria-checked", "true");
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(checkbox).toHaveAttribute("aria-checked", "true");
	await expect(editor.getByText("孫", { exact: true })).toBeVisible();
	await checkbox.hover();
	await page.getByTestId("editor-drag-handle").click();
	await page
		.getByRole("button", { name: "チェックリスト", exact: true })
		.click();
	await expect(checkbox).toHaveAttribute("aria-checked", "true");
	// 独立した本文として保存して開き直し、親子と兄弟の移動を調べる。
	const leaf = (text) =>
		editor
			.getByText(text, { exact: true })
			.locator("xpath=ancestor-or-self::li[1]");
	async function drag(source, target, xOffset, after) {
		await editor.getByText(source, { exact: true }).hover();
		const handle = await page.getByTestId("editor-drag-handle").boundingBox();
		const targetItem = leaf(target);
		const destination = await ((await targetItem.count())
			? targetItem
			: editor.getByText(target, { exact: true })
		).boundingBox();
		assert.ok(handle && destination);
		await page.mouse.move(
			handle.x + handle.width / 2,
			handle.y + handle.height / 2,
		);
		await page.mouse.down();
		const end = {
			x: destination.x + xOffset,
			y: after ? destination.y + destination.height - 2 : destination.y + 2,
		};
		await page.mouse.move(end.x, end.y, { steps: 12 });
		await page.mouse.move(end.x, end.y);
		await expect(page.getByTestId("editor-drop-line")).toHaveCSS(
			"opacity",
			"0.4",
		);
		const indicator = await page.getByTestId("editor-drop-line").boundingBox();
		await page.mouse.up();
		return indicator;
	}
	for (const [bodyBefore, bodyAfter, source, target, parentText, tailText] of [
		[
			"- 前半\n  - 子A\n  - 子B\n\n  後半",
			"- 前半\n  - 子B\n  - 子A\n\n  後半",
			"子B",
			"子A",
			"前半",
			"後半",
		],
		[
			"- - 子A\n\n  本文A\n\n区切り\n\n- - 子B\n\n  本文B\n\n終端",
			"- - 子A\n\n  本文A\n- - 子B\n\n  本文B\n\n区切り\n\n終端",
			"区切り",
			"終端",
			"本文B",
			"本文B",
		],
	]) {
		await replaceMarkdown(bodyBefore);
		console.log("親の前後の本文を持つ子リストのハンドル移動を確認する");
		const parent = leaf(parentText);
		await expect(parent).toHaveCSS("list-style-type", "disc");
		await drag(source, target, 8, false);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(bodyAfter));
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(bodyBefore));
		await editor.press("ControlOrMeta+Shift+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(bodyAfter));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText(tailText, { exact: true })).toBeVisible();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(bodyAfter),
		);
	}
	await replaceMarkdown("- 親A\n  1. 子A\n     - 孫A\n  2. 子B\n- 親B\n- 親C");
	await drag("子B", "子A", 8, false);
	await expect(
		editor.locator("ol").first().locator(":scope > li").first(),
	).toHaveText("子B");
	await editor.press("ControlOrMeta+z");
	await expect(
		editor.locator("ol").first().locator(":scope > li").first(),
	).toHaveText("子A");
	await editor.press("ControlOrMeta+Shift+z");
	await expect(
		editor.locator("ol").first().locator(":scope > li").first(),
	).toHaveText("子B");
	await drag("子A", "親B", 40, true);
	await expect(
		editor
			.locator(":scope > ul > li")
			.filter({ hasText: /^親B$/ })
			.locator("xpath=following-sibling::li[1]/ol"),
	).toContainText("子A");
	await expect(editor.getByText("孫A", { exact: true })).toBeVisible();
	await drag("親B", "親C", 8, true);
	await expect(
		editor
			.locator(":scope > ul > li")
			.filter({ hasText: /^親C$/ })
			.locator("xpath=following-sibling::li[1]"),
	).toHaveText("親B");
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(
		editor
			.locator(":scope > ul > li")
			.filter({ hasText: /^親C$/ })
			.locator("xpath=following-sibling::li[1]"),
	).toHaveText("親B");
	await expect(editor.locator("ol").last()).toContainText("子A");
	await expect(editor.getByText("孫A", { exact: true })).toBeVisible();
	assert.deepEqual(
		await editor
			.locator("ol")
			.evaluateAll((elements) =>
				elements.map((element) => getComputedStyle(element).listStyleType),
			),
		["upper-alpha", "upper-alpha"],
	);
	for (const colorScheme of ["light", "dark"]) {
		await page.emulateMedia({ colorScheme });
		if (colorScheme === "dark")
			await expect(page.locator("html")).toHaveClass(/dark/);
		else await expect(page.locator("html")).not.toHaveClass(/dark/);
		await page.locator("body").evaluate(async (body) => {
			await Promise.all(
				body.getAnimations().map((animation) => animation.finished),
			);
		});
		assert.equal(
			await leaf("親A").evaluate(
				(element) =>
					getComputedStyle(element, "::marker").color ===
					getComputedStyle(element).color,
			),
			true,
		);
		await page.screenshot({
			animations: "disabled",
			path: `/tmp/evame-lists-${colorScheme}.png`,
			fullPage: true,
		});
	}
	for (const [before, start, end, after, endOffset] of [
		[
			"- 選択外\n- 対象\n\n本文",
			"対象",
			"本文",
			"- 選択外\n\n1. 対象\n2. 本文",
			null,
		],
		[
			"- [x] 選択外\n- [x] 対象\n\n本文",
			"対象",
			"本文",
			"- [x] 選択外\n\n1. 対象\n2. 本文",
			null,
		],
		[
			"- 親\n  - 子\n  - 選択外\n- 後",
			"親",
			"子",
			"1. 親\n   1. 子\n   - 選択外\n\n- 後",
			null,
		],
		["- 親\n  - 子\n- 後", "親", "子", "1. 親\n   - 子\n\n- 後", 0],
	]) {
		await replaceMarkdown(before);
		await selectText(start, end, endOffset);
		await page
			.getByTestId("editor-bubble-menu")
			.getByRole("button", { name: "番号付きリスト", exact: true })
			.click();
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText(end, { exact: true })).toBeVisible();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(after),
		);
	}
	for (const backward of [false, true]) {
		await replaceMarkdown("- 対象\n-");
		await editor.evaluate((root, reverse) => {
			const walker = document.createTreeWalker(
				root.querySelector("ul"),
				NodeFilter.SHOW_TEXT,
			);
			const first = walker.nextNode();
			const last = root.querySelector("ul > li:last-child");
			if (!first || !last) throw new Error("選択する項目がありません");
			window
				.getSelection()
				.setBaseAndExtent(reverse ? last : first, 0, reverse ? first : last, 0);
		}, backward);
		await page
			.getByTestId("editor-bubble-menu")
			.getByRole("button", { name: "番号付きリスト", exact: true })
			.click();
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered("1. 対象\n\n-"));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText("対象", { exact: true })).toBeVisible();
		await expect(editor.locator(":scope > ul > li")).toHaveCount(1);
	}

	for (const [key, before, after, indented] of [
		[
			"Tab",
			"- 親\n  1. 既存\n- 対象\n\n本文",
			"- 親\n  1. 既存\n  - 対象\n\n本文",
			true,
		],
		[
			"Shift+Tab",
			"- 親\n  1. 既存\n  2. 対象\n\n本文",
			"- 親\n  1. 既存\n\n1. 対象\n\n本文",
			false,
		],
		["Tab", "- 前\n- ## 対象\n\n本文", "- 前\n  - ## 対象\n\n本文", true],
	]) {
		await replaceMarkdown(before);
		const targetPadding = await editor
			.getByText("対象", { exact: true })
			.evaluate(
				(element) =>
					getComputedStyle(element.closest("h2,li")).paddingInlineStart,
			);
		await selectText("対象", "本文", null);
		await editor.press(key);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		assert.equal(
			await editor
				.getByText("本文", { exact: true })
				.evaluate(
					(element) =>
						Number.parseFloat(
							getComputedStyle(element.closest("p")).paddingInlineStart,
						) > 0,
				),
			indented,
		);
		assert.equal(
			await editor
				.getByText("対象", { exact: true })
				.evaluate(
					(element) =>
						getComputedStyle(element.closest("h2,li")).paddingInlineStart,
				),
			targetPadding,
		);
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(before));
		await editor.press("ControlOrMeta+Shift+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText("本文", { exact: true })).toBeVisible();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(after),
		);
	}

	for (const [html, expected] of [
		["<b>新しい本文</b>", "**新しい本文**"],
		["<b>新しい本文</b><p>次の段落</p>", "**新しい本文**\n\n次の段落"],
	]) {
		const before = "- - 子\n\n  元の本文";
		await replaceMarkdown(before);
		await editor.click();
		await selectBody();
		await editor.evaluate((element, value) => {
			const data = new DataTransfer();
			data.setData("text/html", value);
			element.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData: data,
					bubbles: true,
					cancelable: true,
				}),
			);
		}, html);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(expected));
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(before));
		await editor.press("ControlOrMeta+Shift+z");
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(expected),
		);
	}

	for (const [before, label, after] of [
		["- 対象\n  - 子\n\n  後半", "標準のテキスト", "対象\n\n- 子\n\n後半"],
		["- 対象\n  - 子\n\n  後半", "見出し2", "## 対象\n\n- 子\n\n後半"],
		["- 対象\n  - 子\n\n  後半", "引用", "> 対象\n\n- 子\n\n後半"],
		[
			"- 対象\n  - 子\n\n  後半",
			"コードブロック",
			"```\n対象\n```\n\n- 子\n\n後半",
		],
		["- 前半\n  - 子\n\n  対象", "標準のテキスト", "前半\n\n- 子\n\n対象"],
		["- 前半\n  - 子\n\n  対象", "見出し2", "前半\n\n- 子\n\n## 対象"],
		["- 前半\n  - 子\n\n  対象", "引用", "前半\n\n- 子\n\n> 対象"],
		[
			"- 前半\n  - 子\n\n  対象",
			"コードブロック",
			"前半\n\n- 子\n\n```\n対象\n```",
		],
		["3. 前\n4. 対象\n5. 後", "標準のテキスト", "3. 前\n\n対象\n\n5. 後"],
		["3. 親\n   - 対象\n4. 後", "標準のテキスト", "3. 親\n\n対象\n\n4. 後"],
		["3. 親\n   - 対象\n4. 後", "見出し2", "3. 親\n\n## 対象\n\n4. 後"],
		[
			"1. - 子\n\n   親本文\n2. 対象\n3. 後",
			"標準のテキスト",
			"1. - 子\n\n   親本文\n\n対象\n\n3. 後",
		],
		[
			"- 前半\n  - 対象\n\n  後半",
			"標準のテキスト",
			"- 前半\n\n  対象\n\n  後半",
		],
		["- 前半\n  - 対象\n\n  後半", "見出し2", "- 前半\n\n  ## 対象\n\n  後半"],
		["- 前半\n  - 対象\n\n  後半", "引用", "- 前半\n\n  > 対象\n\n  後半"],
		[
			"- 前半\n  - 対象\n\n  後半",
			"コードブロック",
			"- 前半\n\n  ```\n  対象\n  ```\n\n  後半",
		],
	]) {
		await replaceMarkdown(before);
		await selectText("対象", "対象", null);
		await page
			.getByTestId("editor-bubble-menu")
			.getByRole("button", { name: "ブロックの種類", exact: true })
			.click();
		await page.getByRole("menuitem", { name: label, exact: true }).click();
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(before));
		await editor.press("ControlOrMeta+Shift+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText("対象", { exact: true })).toBeVisible();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(after),
		);
	}
	for (const [beforeBackspace, afterBackspace] of [
		["- 前半\n  - 対象\n\n  後半", "- 前半\n\n  後半\n\n- 対象"],
		["- 対象\n  - 子\n\n  後半", "対象\n\n- 子\n\n後半"],
	]) {
		await replaceMarkdown(beforeBackspace);
		await selectText("対象", "対象", 0);
		await editor.press("Backspace");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(afterBackspace));
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(beforeBackspace));
		await editor.press("ControlOrMeta+Shift+z");
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(afterBackspace),
		);
	}
	await replaceMarkdown("- 親\n  - 前\n  - 対象");
	await selectText("対象", "対象", null);
	await page
		.getByTestId("editor-bubble-menu")
		.getByRole("button", { name: "番号付きリスト", exact: true })
		.click();
	await editor.press("ArrowRight");
	await editor.press("Tab");
	const indented = "- 親\n  - 前\n    1. 対象";
	await expect
		.poll(async () =>
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
		)
		.toEqual(rendered(indented));
	await editor.press("ControlOrMeta+z");
	await expect
		.poll(async () =>
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
		)
		.toEqual(rendered("- 親\n  - 前\n  1. 対象"));
	await editor.press("ControlOrMeta+Shift+z");
	await expect
		.poll(async () =>
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
		)
		.toEqual(rendered(indented));
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(editor.getByText("対象", { exact: true })).toBeVisible();
	assert.deepEqual(
		rendered(await page.locator('input[name="pageContent"]').inputValue()),
		rendered(indented),
	);

	for (const [before, after] of [
		["3. 前\n4. 空\n5. 後", "3. 前\n\n戻った行\n\n5. 後"],
		[
			"- 親\n  1. 前\n  2. 空\n  3. 後",
			"- 親\n  1. 前\n\n1. 戻った行\n\n   3. 後",
		],
	]) {
		await replaceMarkdown(before);
		await selectText("空", "空", null);
		await editor.press("Backspace");
		await editor.press("Enter");
		await editor.pressSequentially("戻った行");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText("後", { exact: true })).toBeVisible();
		await selectText("後", "後", null);
		await editor.press("ArrowRight");
		await editor.pressSequentially("を編集");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after.replace("後", "後を編集")));
	}
	for (const [before, target, after, below] of [
		["- 項目\n\n本文", "項目", "本文\n\n- 項目", false],
		["- 親\n  - 子\n\n本文", "子", "本文\n\n- 親\n  - 子", false],
		[
			"本文\n\n- 親\n  - 子\n    - 孫",
			"子",
			"- 親\n  - 子\n    - 孫\n\n本文",
			true,
		],
	]) {
		await replaceMarkdown(before);
		const list = await editor.locator(":scope > ul").boundingBox();
		const indicator = await drag("本文", target, 8, below);
		assert.ok(list && indicator);
		assert.ok(Math.abs(indicator.x - list.x) < 1);
		assert.ok(
			Math.abs(indicator.y - (below ? list.y + list.height : list.y)) < 1,
		);
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await editor.press("ControlOrMeta+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(before));
		await editor.press("ControlOrMeta+Shift+z");
		await expect
			.poll(async () =>
				rendered(await page.locator('input[name="pageContent"]').inputValue()),
			)
			.toEqual(rendered(after));
		await page
			.getByTestId("save-button-check")
			.waitFor({ state: "visible", timeout: 20000 });
		await page.reload();
		await expect(editor.getByText("本文", { exact: true })).toBeVisible();
		assert.deepEqual(
			rendered(await page.locator('input[name="pageContent"]').inputValue()),
			rendered(after),
		);
	}

	await replaceMarkdown("");
	await editor.pressSequentially("[] ");
	await expect(checkbox).toHaveCount(1);
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(checkbox).toHaveCount(1);
	await editor.click();
	await editor.press("ControlOrMeta+End");
	await editor.pressSequentially("確認");
	await expect(checkbox).toHaveText("確認");
	await editor.press("Enter");
	await expect(checkbox).toHaveCount(2);
	await editor.press("Enter");
	await expect(checkbox).toHaveCount(1);
	await editor.press("ControlOrMeta+z");
	await expect(checkbox).toHaveCount(2);
	await editor.press("ControlOrMeta+Shift+z");
	await expect(checkbox).toHaveCount(1);
	await editor.press("ControlOrMeta+z");
	await expect(checkbox).toHaveCount(2);
	await editor.press("Backspace");
	await expect(checkbox).toHaveCount(1);
	await expect(editor.getByText("確認", { exact: true })).toBeVisible();
	await editor.click();
	await selectBody();
	await editor.press("Backspace");
	await editor.pressSequentially("1. 一段目");
	for (const text of ["二段目", "三段目", "四段目", "五段目"]) {
		await editor.press("Enter");
		await editor.press("Tab");
		await editor.pressSequentially(text);
	}
	// 入力済みの文字列の途中でも、Tabは文字挿入ではなく階層を変える。
	await editor.press("ArrowLeft");
	await editor.press("Shift+Tab");
	await expect(editor.locator("ol")).toHaveCount(4);
	await editor.press("Tab");
	await expect(editor.locator("ol")).toHaveCount(5);
	await expect(editor.getByText("五段目", { exact: true })).toHaveText(
		"五段目",
	);
	await page
		.getByTestId("save-button-check")
		.waitFor({ state: "visible", timeout: 20000 });
	await page.reload();
	await expect(editor.getByText("五段目", { exact: true })).toBeVisible();
	assert.deepEqual(
		await editor
			.locator("ol")
			.evaluateAll((elements) =>
				elements.map((element) => getComputedStyle(element).listStyleType),
			),
		["decimal", "upper-alpha", "lower-alpha", "upper-roman", "lower-roman"],
	);
	await page.setViewportSize({ width: 390, height: 900 });
	await expect(editor.getByText("五段目", { exact: true })).toBeVisible();
	await page.screenshot({
		path: "/tmp/evame-lists-mobile.png",
		animations: "disabled",
		fullPage: true,
	});
	await page.setViewportSize({ width: 1280, height: 900 });
	console.log(
		"混在リストの入力・Tab・項目と子項目のD&D・Undo/Redo・保存と再読み込みを確認できる",
	);
}
