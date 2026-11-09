import { writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { expect, test } from "@playwright/test";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { htmlTree } from "../markdown-html.mjs";

const commonmark = unified()
	.use(remarkParse)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeStringify, { allowDangerousHtml: true });
const gfm = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeStringify, { allowDangerousHtml: true });

test.beforeEach(async ({ page }) => {
	await page.route("**/*", (route) => {
		const url = new URL(route.request().url());
		return url.hostname === "127.0.0.1" || url.protocol === "data:"
			? route.continue()
			: route.abort();
	});
	await page.goto("/");
	await page.evaluate(() => window.ready);
});

// Shared by keyboard and toolbar cases: use the browser's real DOM Selection,
// keeping UTF16 offsets intact rather than replacing Vditor's editing behavior.
async function selectText(page, selector, start, end) {
	await page.locator(".vditor-wysiwyg [contenteditable=true]").focus();
	await page.locator(selector).evaluate(
		(element, [start, end]) => {
			const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
			const texts = [];
			while (walker.nextNode()) texts.push(walker.currentNode);
			const point = (offset) => {
				for (const text of texts) {
					if (offset <= text.length) return [text, offset];
					offset -= text.length;
				}
				if (offset === 0) return [element, element.childNodes.length];
				throw new Error("Selection offset outside text");
			};
			const selection = getSelection();
			selection.setBaseAndExtent(...point(start), ...point(end));
		},
		[start, end],
	);
}

for (const [name, source, selector, offset, expected] of [
	["箇条書き", "- 一つ\n", ".vditor-wysiwyg li", 2, "- 一つ\n- 次\n"],
	["番号付きリスト", "3. 一つ\n", ".vditor-wysiwyg li", 2, "3. 一つ\n4. 次\n"],
	[
		"入れ子",
		"- 親\n  - 子\n",
		".vditor-wysiwyg li li",
		1,
		"- 親\n  - 子\n  - 次\n",
	],
	[
		"チェックリスト",
		"- [x] 一つ\n",
		".vditor-wysiwyg li",
		3,
		"- [x] 一つ\n- [ ] 次\n",
	],
]) {
	test(`${name}の文字の後でReturnを押すと同じ深さの次項目になる`, async ({
		page,
	}) => {
		await page.evaluate(
			(source) => window.editor.setValue(source, true),
			source,
		);
		await selectText(page, selector, offset, offset);
		await page.keyboard.press("Enter");
		await page.keyboard.insertText("次");
		const saved = await page.evaluate(() => window.editor.getValue());
		expect(htmlTree(String(gfm.processSync(saved)))).toEqual(
			htmlTree(String(gfm.processSync(expected))),
		);
	});
}

test("空の入れ子項目のReturnで親リストの次項目へ一段戻る", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("- 親\n  - 子\n", true));
	await selectText(page, ".vditor-wysiwyg li li", 1, 1);
	await page.keyboard.press("Enter");
	await page.keyboard.press("Enter");
	await page.keyboard.insertText("外側");
	const saved = await page.evaluate(() => window.editor.getValue());
	expect(htmlTree(String(commonmark.processSync(saved)))).toEqual(
		htmlTree(String(commonmark.processSync("- 親\n  - 子\n- 外側\n"))),
	);
});

test("最外の空項目のReturnでリストを抜けて通常段落へ入力する", async ({
	page,
}) => {
	await page.evaluate(() => window.editor.setValue("- 項目\n", true));
	await selectText(page, ".vditor-wysiwyg li", 2, 2);
	await page.keyboard.press("Enter");
	await page.keyboard.press("Enter");
	await page.keyboard.insertText("段落");
	const saved = await page.evaluate(() => window.editor.getValue());
	expect(htmlTree(String(commonmark.processSync(saved)))).toEqual(
		htmlTree(String(commonmark.processSync("- 項目\n\n段落\n"))),
	);
});

test("Backspaceで通常文字と絵文字を削除する", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("a😀b\n", true));
	await selectText(page, ".vditor-wysiwyg p", 4, 4);
	await page.keyboard.press("Backspace");
	await expect(page.locator(".vditor-wysiwyg p")).toHaveText("a😀");
	await page.keyboard.press("Backspace");
	await expect(page.locator(".vditor-wysiwyg p")).toHaveText("a");
	expect(await page.evaluate(() => window.editor.getValue())).toBe("a\n");
});

test("段落先頭のBackspaceで前の段落へ結合する", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("前\n\n後\n", true));
	await selectText(page, ".vditor-wysiwyg p:nth-child(2)", 0, 0);
	await page.keyboard.press("Backspace");
	await expect(page.locator(".vditor-wysiwyg p")).toHaveText("前後");
	expect(await page.evaluate(() => window.editor.getValue())).toBe("前後\n");
});

test("リスト先頭のBackspaceで文字を保ったままリストを解除する", async ({
	page,
}) => {
	await page.evaluate(() => window.editor.setValue("- 項目\n", true));
	await selectText(page, ".vditor-wysiwyg li", 0, 0);
	await page.keyboard.press("Backspace");
	const saved = await page.evaluate(() => window.editor.getValue());
	expect(htmlTree(String(commonmark.processSync(saved)))).toEqual(
		htmlTree("<p>項目</p>"),
	);
});

test("絵文字を跨ぐ選択を入力文字で置き換える", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("前😀後\n", true));
	await selectText(page, ".vditor-wysiwyg p", 1, 3);
	await page.keyboard.insertText("選択");
	await expect(page.locator(".vditor-wysiwyg p")).toHaveText("前選択後");
});

test("改行のUndoとRedoでリスト項目と内容が戻る", async ({ page, isMobile }) => {
	await page.evaluate(() => window.editor.setValue("- 一つ\n"));
	// setValue records history asynchronously. Wait for the loaded document to be
	// in history before recording Return; a timer delay would conceal that race.
	await expect(page.locator('[data-type="undo"]')).not.toHaveClass(/disabled/);
	await selectText(page, ".vditor-wysiwyg li", 2, 2);
	await page.keyboard.press("Enter");
	await expect(page.locator('[data-type="undo"]')).not.toHaveClass(/disabled/);
	const undo = page.locator('.vditor-toolbar [data-type="undo"]');
	if (isMobile) await undo.tap();
	else await undo.click();
	await expect(page.locator(".vditor-wysiwyg li")).toHaveCount(1);
	const redo = page.locator('.vditor-toolbar [data-type="redo"]');
	if (isMobile) await redo.tap();
	else await redo.click();
	await expect(page.locator(".vditor-wysiwyg li")).toHaveCount(2);
});

for (const text of ["日本語", "English"]) {
	for (const bold of [false, true]) {
		test(`${text}の${bold ? "太字併用" : "通常"}斜体を適用し描画と解除を確認する`, async ({
			page,
			isMobile,
		}, info) => {
			await page.evaluate(
				({ text, bold }) =>
					window.editor.setValue(bold ? `**${text}**\n` : `${text}\n`, true),
				{ text, bold },
			);
			await selectText(page, ".vditor-wysiwyg p", 0, text.length);
			const paragraph = page.locator(".vditor-wysiwyg p");
			// Hide selection paint for a comparison of glyph rendering only.
			await page.addStyleTag({
				content: "::selection { background: transparent; color: inherit; }",
			});
			const before = await paragraph.screenshot({ caret: "hide" });
			const italic = page.locator('.vditor-toolbar [data-type="italic"]');
			if (isMobile) await italic.tap();
			else await italic.click();
			await expect(paragraph.locator("em, i")).toHaveText(text);
			await expect(paragraph.locator("em, i")).toHaveCSS(
				"font-style",
				"italic",
			);
			const applied = await paragraph.screenshot({ caret: "hide" });
			expect(applied.equals(before), "斜体で文字の描画が変わる").toBe(false);
			await info.attach("斜体の描画", {
				body: applied,
				contentType: "image/png",
			});
			if (isMobile) await italic.tap();
			else await italic.click();
			await expect(paragraph.locator("em, i")).toHaveCount(0);
			expect(
				(await paragraph.screenshot({ caret: "hide" })).equals(before),
				"解除で元の描画へ戻る",
			).toBe(true);
		});
	}
}

test("Markdownのリスト記法を空白入力で変換する", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("", true));
	await page.locator(".vditor-wysiwyg [contenteditable=true]").focus();
	await page.keyboard.type("- ");
	await page.keyboard.insertText("項目");
	await expect(page.locator(".vditor-wysiwyg li")).toHaveText("項目");
});

test("IME未確定中の記号は変換せずcompositionend後に編集を続けられる", async ({
	page,
}) => {
	await page.evaluate(() => window.editor.setValue("", true));
	const editable = page.locator(".vditor-wysiwyg [contenteditable=true]");
	await editable.focus();
	await editable.dispatchEvent("compositionstart", { data: "" });
	await page.keyboard.insertText("- ");
	await expect(page.locator(".vditor-wysiwyg li")).toHaveCount(0);
	await page.keyboard.insertText("日本語");
	await editable.dispatchEvent("compositionend", { data: "- 日本語" });
	await page.keyboard.press("End");
	await page.keyboard.insertText("確定");
	expect(await page.evaluate(() => window.editor.getValue())).toContain(
		"日本語確定",
	);
});

test("リスト内のインデントコードを編集DOMと保存後にも保持する", async ({
	page,
}) => {
	await page.evaluate(() => window.editor.setValue("- foo\n\n\t\tbar\n", true));
	await expect(page.locator(".vditor-wysiwyg li pre code")).toHaveText(
		"  bar\n",
	);
	const saved = await page.evaluate(() => window.editor.getValue());
	expect(htmlTree(String(commonmark.processSync(saved)))).toEqual(
		htmlTree(String(commonmark.processSync("- foo\n\n\t\tbar\n"))),
	);
});

test("未使用の参照定義のURLと題名を保存し後から追加したリンクを解決できる", async ({
	page,
}) => {
	const saved = await page.evaluate(() => {
		window.editor.setValue(
			'本文\n\n[ref]: https://example.test/path "題名"\n',
			true,
		);
		return window.editor.getValue();
	});
	expect(saved).toContain("https://example.test/path");
	await page.evaluate(
		(saved) => window.editor.setValue(`${saved}\n\n[後から][ref]\n`, true),
		saved,
	);
	const html = await page.evaluate(() => window.editor.getHTML());
	expect(htmlTree(html)).toEqual(
		htmlTree(
			'<p>本文</p>\n<p><a href="https://example.test/path" title="題名">後から</a></p>\n',
		),
	);
});

test("画像URLと題名と表セルのパイプを保存して再読み込みする", async ({
	page,
}) => {
	const source =
		'![代替](https://example.test/image.png "題名")\n\n| A | B |\n| - | - |\n| a \\| b | `code` |\n';
	await page.evaluate((source) => {
		window.editor.setValue(source, true);
		window.editor.setValue(window.editor.getValue(), true);
	}, source);
	await expect(page.locator(".vditor-wysiwyg img")).toHaveAttribute(
		"src",
		"https://example.test/image.png",
	);
	await expect(page.locator(".vditor-wysiwyg img")).toHaveAttribute(
		"title",
		"題名",
	);
	await expect(page.locator(".vditor-wysiwyg td").first()).toHaveText("a | b", {
		useInnerText: true,
	});
});

for (const [name, text] of [
	["先頭4空白", "    literal"],
	["末尾2空白", "literal  "],
	["先頭空白とタブ", " \tliteral"],
	["Unicode区切り文字", "A\u2028B"],
	["日本語と絵文字", "日本語😀"],
]) {
	test(`段落へ直接入力した${name}を保存後も文字として保持する`, async ({
		page,
	}) => {
		await page.evaluate(() => window.editor.setValue("", true));
		await page.locator(".vditor-wysiwyg [contenteditable=true]").focus();
		await page.keyboard.insertText(text);
		const saved = await page.evaluate(() => window.editor.getValue());
		const document = unified().use(remarkParse).parse(saved);
		expect(document.children).toMatchObject([
			{ type: "paragraph", children: [{ type: "text", value: text }] },
		]);
	});
}

test("標準設定と比較設定で強制改行と参照の題名とコードフェンスの保存結果を照合する", async ({
	page,
}, info) => {
	const results = await page.evaluate(async () => {
		const container = document.createElement("div");
		container.id = "control";
		document.body.append(container);
		let control;
		await new Promise((resolve) => {
			control = new Vditor("control", {
				cdn: new URL(".", location.href).href.replace(/\/$/, ""),
				lang: "ja_JP",
				mode: "wysiwyg",
				cache: { enable: false },
				preview: { hljs: { enable: false } },
				after: resolve,
			});
		});
		const results = [16, 23, 123].map((example) => {
			const source = window.corpus.find(
				(entry) =>
					entry.corpus === "commonmark-0.31.2" && entry.example === example,
			).markdown;
			window.editor.setValue(source, true);
			control.setValue(source, true);
			return {
				example,
				source,
				configured: window.editor.getValue(),
				standard: control.getValue(),
			};
		});
		control.destroy();
		return results;
	});
	await info.attach("標準設定の対照結果", {
		body: JSON.stringify(results, null, 2),
		contentType: "application/json",
	});
	for (const row of results)
		expect(row.standard, `CommonMark ${row.example}`).toBe(row.configured);
});

test("装飾付きHTMLの貼り付けで日本語と太字斜体を保持する", async ({ page }) => {
	await page.evaluate(() => window.editor.setValue("", true));
	const editable = page.locator(".vditor-wysiwyg [contenteditable=true]");
	await editable.focus();
	await editable.evaluate((element) => {
		const data = new DataTransfer();
		data.setData(
			"text/html",
			"<p><strong>太字</strong><em>斜体italic</em>通常</p>",
		);
		data.setData("text/plain", "太字斜体italic通常");
		element.dispatchEvent(
			new ClipboardEvent("paste", {
				clipboardData: data,
				bubbles: true,
				cancelable: true,
			}),
		);
	});
	await expect
		.poll(() => page.evaluate(() => window.editor.getHTML()))
		.toBe("<p><strong>太字</strong><em>斜体italic</em>通常</p>\n");
});

test("表セルへ文字を入力し保存して再読み込みしても隣のセルを保持する", async ({
	page,
}) => {
	await page.evaluate(() =>
		window.editor.setValue("| A | B |\n| - | - |\n| 日本語 | 隣 |\n", true),
	);
	await selectText(page, ".vditor-wysiwyg td:first-child", 3, 3);
	await page.keyboard.insertText("追加");
	await page.evaluate(() =>
		window.editor.setValue(window.editor.getValue(), true),
	);
	await expect(page.locator(".vditor-wysiwyg td").first()).toHaveText(
		"日本語追加",
	);
	await expect(page.locator(".vditor-wysiwyg td").nth(1)).toHaveText("隣");
});

test("公式CommonMarkとGFMの全1329例をWYSIWYGで保存してHTML構造を比較する", async ({
	page,
}, info) => {
	const rows = await page.evaluate(() => window.runCorpus());
	expect(rows).toHaveLength(1329);
	const summaries = [];
	for (const [corpus, count] of [
		["commonmark-0.31.2", 652],
		["gfm-0.29", 677],
	]) {
		const renderer = corpus.startsWith("gfm") ? gfm : commonmark;
		const cases = rows
			.filter((row) => row.corpus === corpus)
			.map((row) => {
				const beforeHTML = String(renderer.processSync(row.markdown));
				const afterHTML = row.error
					? null
					: String(renderer.processSync(row.saved));
				return {
					...row,
					beforeHTML,
					afterHTML,
					preserved:
						afterHTML !== null &&
						isDeepStrictEqual(htmlTree(beforeHTML), htmlTree(afterHTML)),
					goldenBaselineEqual: isDeepStrictEqual(
						htmlTree(beforeHTML),
						htmlTree(row.html),
					),
				};
			});
		expect(cases).toHaveLength(count);
		expect(new Set(cases.map((row) => row.example)).size).toBe(count);
		summaries.push({
			corpus,
			count,
			preserved: cases.filter((row) => row.preserved).length,
			goldenBaselineEqual: cases.filter((row) => row.goldenBaselineEqual)
				.length,
			cases,
		});
	}
	await writeFile(
		info.outputPath("corpus.json"),
		JSON.stringify(
			{ vditor: "4.0.1", browser: info.project.name, summaries },
			null,
			2,
		),
	);
	console.log(
		"VDITOR_CORPUS",
		info.project.name,
		summaries.map(({ cases, ...summary }) => summary),
	);
	for (const summary of summaries)
		expect.soft(summary.preserved, summary.corpus).toBe(summary.count);
});

test("WYSIWYGでMarkdownを読み込み見出しと表を編集用DOMに保持する", async ({
	page,
}) => {
	await page.evaluate(() =>
		window.editor.setValue(
			"# 見出し\n\n| A | B |\n| - | - |\n| 日本語 | text |\n",
			true,
		),
	);
	await expect(page.locator(".vditor-wysiwyg h1")).toHaveText("見出し");
	await expect(page.locator(".vditor-wysiwyg td").first()).toHaveText("日本語");
	expect(await page.evaluate(() => window.editor.getValue())).toContain(
		"見出し",
	);
});
