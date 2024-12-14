import { describe, test, expect } from "vitest";
import { prisma } from "~/utils/prisma";
import { processMarkdownContent } from "./syncMarkdown";

describe("processMarkdownContent", () => {
	test("should parse markdown, insert source_texts, and return a page with data-id spans", async () => {
		const pageSlug = "test-page";
		const markdown = `# Title

This is a test.

This is another test.
`;

		// Markdownを処理
		const user = await prisma.user.upsert({
			where: { id: 1 },
			create: {
				id: 1,
				userName: "test",
				email: "test@example.com",
				displayName: "test",
				icon: "test",
			},
			update: {},
		});
		const page = await processMarkdownContent(markdown, pageSlug, user.id);

		// ページがDBに存在し、HTMLが変換されているか確認
		const dbPage = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});

		expect(dbPage).not.toBeNull();
		if (!dbPage) return;

		// source_textsが挿入されているか確認
		// このMarkdownには `This is a test.` と `This is another test.` の2つの本文テキストノードがある
		expect(dbPage.sourceTexts.length).toBeGreaterThanOrEqual(2);

		// ページHTMLがdata-id付きspanを含むか確認
		// processMarkdownContent後にはHTMLが更新されているはず
		const updatedPage = await prisma.page.findUnique({
			where: { slug: pageSlug },
		});

		expect(updatedPage).not.toBeNull();
		if (!updatedPage) return;

		const htmlContent = updatedPage.content;
		// <span data-id="...">This is a test.</span> がHTML内に挿入されることを期待
		expect(htmlContent).toMatch(/<span data-id="\d+">This is a test\.<\/span>/);
		expect(htmlContent).toMatch(
			/<span data-id="\d+">This is another test\.<\/span>/,
		);

		// source_textsのnumberが連番になっているかチェック
		const sortedTexts = dbPage.sourceTexts.sort((a, b) => a.number - b.number);
		expect(sortedTexts[0].number).toBe(1);
		expect(sortedTexts[1].number).toBe(2);

		// hashが設定されているか
		expect(sortedTexts[0].hash).not.toBeNull();
		expect(sortedTexts[1].hash).not.toBeNull();
	});

	test("should retain sourceTextId after minor edit", async () => {
		const pageSlug = "test-page-edit";
		const originalMarkdown = `# Title

This is a line.

This is another line.

1
`;

		const user = await prisma.user.upsert({
			where: { id: 2 },
			create: {
				id: 2,
				userName: "editor",
				email: "editor@example.com",
				displayName: "editor",
				icon: "editor",
			},
			update: {},
		});

		// 初回登録
		await processMarkdownContent(originalMarkdown, pageSlug, user.id);
		const dbPage1 = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage1).not.toBeNull();
		if (!dbPage1) return;

		expect(dbPage1.sourceTexts.length).toBeGreaterThanOrEqual(4);
		const originalIds = dbPage1.sourceTexts.map((t) => t.id);
		const originalTexts = dbPage1.sourceTexts.map((t) => t.text);
		const originalMap = new Map<string, number>();
		for (const st of dbPage1.sourceTexts) {
			originalMap.set(st.text, st.id);
		}
		// Markdown変更
		const editedMarkdown = `# Title

This is a line!?

This is another line.

test

1
`;

		// 再パース（編集後）
		await processMarkdownContent(editedMarkdown, pageSlug, user.id);
		const dbPage2 = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage2).not.toBeNull();
		if (!dbPage2) return;

		expect(dbPage2.sourceTexts.length).toBeGreaterThanOrEqual(5);
		const editedIds = dbPage2.sourceTexts.map((t) => t.id);
		const editedTexts = dbPage2.sourceTexts.map((t) => t.text);
		const editedMap = new Map<string, number>();
		for (const st of dbPage2.sourceTexts) {
			editedMap.set(st.text, st.id);
		}
		expect(editedMap.get("This is another line.")).toBe(
			originalMap.get("This is another line."),
		);
		expect(editedMap.get("This is a line!?")).not.toBe(
			originalMap.get("This is a line."),
		);
		expect(editedMap.get("test")).not.toBe(originalMap.get("1"));
		expect(editedMap.get("1")).toBe(originalMap.get("1"));
	});

	test("should handle various markdown syntaxes", async () => {
		const pageSlug = "test-page-variety";
		const markdown = `# Heading
  
  - List item 1
  - List item 2
  
  **Bold text** and *italic text*
  
  [Link](https://example.com)
  
  > Blockquote
  
  \`inline code\`
  
  \`\`\`
  code block
  \`\`\`
  
  ---
  
  ![Alt text](https://example.com/image.jpg)
  
  | Column 1 | Column 2 |
  |----------|----------|
  | Cell A   | Cell B   |
  
  - [ ] Task list item 1
  - [x] Task list item 2 (done)
  
  Footnote test[^1]
  
  [^1]: This is a footnote.
  `;

		const user = await prisma.user.upsert({
			where: { id: 3 },
			create: {
				id: 3,
				userName: "variety",
				email: "variety@example.com",
				displayName: "variety",
				icon: "variety",
			},
			update: {},
		});

		const page = await processMarkdownContent(markdown, pageSlug, user.id);

		const dbPage = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage).not.toBeNull();
		if (!dbPage) return;

		// 複数のテキストブロックが想定される
		// Heading, List items, Bold text, italic text, Link, Blockquote, inline code, footnote, table cells, task listなど多数
		expect(dbPage.sourceTexts.length).toBeGreaterThanOrEqual(10);

		const htmlContent = dbPage.content;
		console.log(htmlContent);

		// 以下、それぞれのテキストが<span data-id="...">で囲まれているかを最低1つずつ確認
		expect(htmlContent).toMatch(/<span data-id="\d+">Bold text<\/span>/);
		expect(htmlContent).toMatch(/<span data-id="\d+">List item 1<\/span>/);
		expect(htmlContent).toMatch(/<span data-id="\d+">Link<\/span>/);
		expect(htmlContent).toMatch(/<span data-id="\d+">Blockquote<\/span>/);

		// コードブロックはプレーンテキストとして抽出されるか、またはプレーンテキストノードがない可能性あり
		// ここでは、"code block"がspanで囲まれてないことを確認（例: コードブロック内部がそのままテキストとして抽出されるかは実装次第）
		expect(htmlContent).not.toMatch(/<span data-id="\d+">code block<\/span>/);

		// 新たに追加した要素についても確認
		// 画像代替テキスト "Alt text"
		expect(htmlContent).not.toMatch(/<span data-id="\d+">Alt text<\/span>/);

		// テーブルセルテキスト "Cell A" "Cell B"
		expect(htmlContent).toMatch(/<span data-id="\d+">Cell A<\/span>/);
		expect(htmlContent).toMatch(/<span data-id="\d+">Cell B<\/span>/);

		// タスクリスト "Task list item 1" "Task list item 2 (done)"
		expect(htmlContent).toMatch(/<span data-id="\d+">Task list item 1<\/span>/);
		expect(htmlContent).toMatch(
			/<span data-id="\d+">Task list item 2 \(done\)<\/span>/,
		);

		// 脚注[^1]では脚注本文"This is a footnote."がテキストとしてどのように抽出されるかは実装依存
		// ここではフットノートの本文"This is a footnote."がspanで囲まれているかを簡易チェック
		expect(htmlContent).toMatch(
			/<span data-id="\d+">This is a footnote\.<\/span>/,
		);
	});
	test("should handle various markdown syntaxes and verify numbering", async () => {
		const pageSlug = "test-page-variety-numbering";
		const markdown = `# Heading
  
  - List item 1
  - List item 2
  
  **Bold text** and *italic text*
  
  [Link](https://example.com)
  
  > Blockquote
  
  \`inline code\`
  
  \`\`\`
  code block
  \`\`\`
  
  ---
  
  ![Alt text](https://example.com/image.jpg)
  
  | Column 1 | Column 2 |
  |----------|----------|
  | Cell A   | Cell B   |
  
  - [ ] Task list item 1
  - [x] Task list item 2 (done)
  
  Footnote test[^1]
  
  [^1]: This is a footnote.
  `;

		const user = await prisma.user.upsert({
			where: { id: 3 },
			create: {
				id: 3,
				userName: "variety",
				email: "variety@example.com",
				displayName: "variety",
				icon: "variety",
			},
			update: {},
		});

		await processMarkdownContent(markdown, pageSlug, user.id);

		const dbPage = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage).not.toBeNull();
		if (!dbPage) return;

		const { sourceTexts } = dbPage;
		// テキスト数が期待以上であることを確認（複数要素があるので10以上を想定）
		expect(sourceTexts.length).toBeGreaterThanOrEqual(10);

		const textsByNumber = [...sourceTexts].sort((a, b) => a.number - b.number);

		// textsByNumberは、全てのテキストノードがMarkdown中に現れた順に並ぶはず。
		// 例えば、最初に現れるテキストはHeadingの"Heading"、その次は"List item 1", "List item 2"...
		// ここでは、いくつかのテキストの順番をサンプルチェックします。

		expect(textsByNumber[0].text).toBe("Heading");

		expect(textsByNumber[1].text).toBe("List item 1");
		expect(textsByNumber[2].text).toBe("List item 2");
		expect(textsByNumber[3].text).toBe("**Bold text** and *italic text*");
		expect(textsByNumber[4].text).toBe("[Link](https://example.com)");
		expect(textsByNumber[5].text).toBe("> Blockquote");
		expect(textsByNumber[8].text).toBe("---");
		expect(textsByNumber[9].text).toBe("![Alt text](https://example.com/image.jpg)");

		// これらの検証により、テキストが出現順にnumberが振られていることをある程度確認できます。
	});
});
