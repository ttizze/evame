import { describe, expect, test } from "vitest";
import { prisma } from "~/utils/prisma";
import { processMarkdownContent } from "./processMarkdownContent";

describe("processMarkdownContent", () => {
	test("should parse markdown, insert source_texts, and return a page with data-id spans", async () => {
		const pageSlug = "test-page";
		const title = "Title";
		const markdown = `

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
		await processMarkdownContent(
			title,
			markdown,
			pageSlug,
			user.id,
			"en",
			"PUBLIC",
		);

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
		expect(htmlContent).toMatch(
			/<span data-source-text-id="\d+">This is a test\.<\/span>/,
		);
		expect(htmlContent).toMatch(
			/<span data-source-text-id="\d+">This is another test\.<\/span>/,
		);

		// source_textsのnumberが連番になっているかチェック
		const sortedTexts = dbPage.sourceTexts.sort((a, b) => a.number - b.number);
		expect(sortedTexts[0].number).toBe(0);
		expect(sortedTexts[1].number).toBe(1);

		// hashが設定されているか
		expect(sortedTexts[0].textAndOccurrenceHash).not.toBeNull();
		expect(sortedTexts[1].textAndOccurrenceHash).not.toBeNull();
	});

	test("should retain sourceTextId after minor edit", async () => {
		const pageSlug = "test-page-edit";
		const title = "Title";
		const originalMarkdown = `# Title

This is a line.

This is another line.

1. List item 1

2. List item 2
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
		await processMarkdownContent(
			title,
			originalMarkdown,
			pageSlug,
			user.id,
			"en",
			"PUBLIC",
		);
		const dbPage1 = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage1).not.toBeNull();
		if (!dbPage1) return;

		expect(dbPage1.sourceTexts.length).toBeGreaterThanOrEqual(4);
		const originalMap = new Map<string, number>();
		for (const st of dbPage1.sourceTexts) {
			originalMap.set(st.text, st.id);
		}
		// Markdown変更

		const editedMarkdown = `# Title

This is a line!?

This is another line.

new line

1. List item 1
2. List item 2
`;

		// 再パース（編集後）
		await processMarkdownContent(
			title,
			editedMarkdown,
			pageSlug,
			user.id,
			"en",
			"PUBLIC",
		);
		const dbPage2 = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage2).not.toBeNull();
		if (!dbPage2) return;

		expect(dbPage2.sourceTexts.length).toBeGreaterThanOrEqual(5);
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
		expect(editedMap.get("new line")).not.toBe(originalMap.get("1"));
		expect(editedMap.get("1. List item 1")).toBe(
			originalMap.get("1. List item 1"),
		);
	});

	test("should handle various markdown syntaxes", async () => {
		const pageSlug = "test-page-variety";
		const title = "Title";
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

		await processMarkdownContent(
			title,
			markdown,
			pageSlug,
			user.id,
			"en",
			"PUBLIC",
		);

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

		expect(htmlContent).toMatch(
			/<span data-source-text-id="\d+">\<strong>Bold text<\/strong> and <em>italic text<\/em><\/span>/,
		);

		expect(htmlContent).not.toMatch(
			/<span data-source-text-id="\d+">code block<\/span>/,
		);

		// 新たに追加した要素についても確認
		// 画像代替テキスト "Alt text"
		expect(htmlContent).not.toMatch(
			/<span data-source-text-id="\d+">Alt text<\/span>/,
		);
	});
	test("should handle various markdown syntaxes and verify numbering", async () => {
		const pageSlug = "test-page-variety-numbering";
		const title = "Heading";
		const markdown = `
  
  - List item 1
  - List item 2
  
  **Bold text** and *italic text*
  
  [Link](https://example.com)
  
  > Blockquote
  
  \`\`\`
  code block
  \`\`\`

  1. List item 1
  2. List item 2
  
  ---
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

		await processMarkdownContent(
			title,
			markdown,
			pageSlug,
			user.id,
			"en",
			"PUBLIC",
		);

		const dbPage = await prisma.page.findUnique({
			where: { slug: pageSlug },
			include: { sourceTexts: true },
		});
		expect(dbPage).not.toBeNull();
		if (!dbPage) return;

		const { sourceTexts } = dbPage;
		expect(sourceTexts.length).toBeGreaterThanOrEqual(7);

		const textsByNumber = [...sourceTexts].sort((a, b) => a.number - b.number);

		expect(textsByNumber[0].text).toBe("Heading");

		expect(textsByNumber[1].text).toBe("List item 1");
		expect(textsByNumber[2].text).toBe("List item 2");
		expect(textsByNumber[3].text).toBe("Bold text and italic text");
		expect(textsByNumber[4].text).toBe("Link");
		expect(textsByNumber[5].text).toBe("Blockquote");
		expect(textsByNumber[6].text).toBe("List item 1");
		expect(textsByNumber[7].text).toBe("List item 2");
	});
});
