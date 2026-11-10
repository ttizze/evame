import frontMatter from "front-matter";
import type { Root } from "mdast";
import rehypeRaw from "rehype-raw";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import {
	exportImageFilename,
	getExportImageKey,
	getExportImageUrls,
	serializeExportPage,
} from "./export-document";

describe("書き出す画像の参照", () => {
	it("画像のsrcを書き換えてもdetailsを閉じず内側のMarkdown本文を保つ", () => {
		const tree = remark().parse(
			'<details><summary>概要</summary><img src="https://images.evame.tech/uploads/a">\n\n**本文**\n\n</details>',
		);
		const { markdown } = serializeExportPage(
			metadata,
			tree,
			new Map([["https://images.evame.tech/uploads/a", "images/a.jpg"]]),
		);
		const processor = remark()
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeRaw);
		const rendered = processor.runSync(
			processor.parse(frontMatter(markdown).body),
		);
		const contents: string[] = [];
		visit(rendered, "element", (node) => {
			if (node.tagName === "details")
				visit(node, "element", (child) => contents.push(child.tagName));
		});
		expect(contents).toContain("strong");
		expect(markdown).toContain('src="../images/a.jpg"');
	});
	it("生HTMLの画像も同梱対象とし、元のsrcset属性は保持する", () => {
		const tree = remark().parse(
			'<figure><img src="https://images.evame.tech/uploads/a" srcset="https://external.example/a 2x" alt="写真"></figure>',
		);
		expect(getExportImageUrls(tree)).toEqual([
			"https://images.evame.tech/uploads/a",
		]);
		const { markdown } = serializeExportPage(
			metadata,
			tree,
			new Map([["https://images.evame.tech/uploads/a", "images/a.jpg"]]),
		);
		expect(markdown).toContain('src="../images/a.jpg"');
		expect(markdown).toContain('srcset="https://external.example/a 2x"');
	});
	it("同じR2キーには安定したファイル名を付け、画像の種類を拡張子に残す", async () => {
		const jpeg = await exportImageFilename("uploads/a", "image/jpeg");
		expect(jpeg).toMatch(/^images\/[a-f0-9]{64}\.jpg$/);
		expect(await exportImageFilename("uploads/a", "image/jpeg")).toBe(jpeg);
		expect(await exportImageFilename("uploads/b", "image/svg+xml")).toMatch(
			/\.svg$/,
		);
		expect(
			await exportImageFilename("uploads/old.png", "application/octet-stream"),
		).toMatch(/\.png$/);
	});
	it("本文・表・参照形式の画像を集め、通常のリンクとコードを含めない", () => {
		const tree = remark()
			.use(remarkGfm)
			.parse(
				"![写真](https://images.evame.tech/uploads/a)\n\n| 画像 |\n| --- |\n| ![写真][photo] |\n\n[photo]: https://images.evame.tech/uploads/b\n\n[リンク](https://example.com/link)\n\n`![コード](https://example.com/code)`\n\n![重複](https://images.evame.tech/uploads/a)",
			);
		expect(getExportImageUrls(tree)).toEqual([
			"https://images.evame.tech/uploads/a",
			"https://images.evame.tech/uploads/b",
		]);
	});
	it.each([
		["https://images.evame.tech/uploads/a?width=640", "uploads/a"],
		["https://images.eveeve.org/evame/uploads/a", "evame/uploads/a"],
		["https://custom.example.com/uploads/a", "uploads/a"],
		["/api/uploads/uploads/a", "uploads/a"],
		["https://app.example.com/api/uploads/uploads/a", "uploads/a"],
	])("保存済み画像 %s からR2のキーを取得する", (url, key) => {
		expect(
			getExportImageKey(url, "https://app.example.com", "custom.example.com"),
		).toBe(key);
	});
	it.each([
		"https://images.evame.tech.attacker.example/uploads/a",
		"https://attacker.example/api/uploads/uploads/a",
		"https://images.evame.tech/private/secrets",
		"https://user:password@images.evame.tech/uploads/a",
		"https://images.evame.tech/uploads/%2e%2e%2fprivate",
		"https://images.evame.tech/uploads/a%00b",
		"data:image/png;base64,AA==",
		"javascript:alert(1)",
	])("保存済み画像として扱えない %s は取得しない", (url) => {
		expect(
			getExportImageKey(url, "https://app.example.com", "custom.example.com"),
		).toBeNull();
	});
});

const metadata = {
	id: 42,
	slug: "my-note",
	title: '題名: "メモ"\n次の行',
	sourceLocale: "ja",
	status: "DRAFT" as const,
	commentsEnabled: true,
	parentId: null,
	publishedAt: null,
	createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-02T00:00:00Z"),
	tags: ["旅行", "日記"],
};

describe("文書のMarkdown書き出し", () => {
	it("タイトル・公開状態などを安全なfrontmatterへ保存し、画像を相対パスへ変換する", () => {
		const tree = remark()
			.use(remarkGfm)
			.parse(
				"## 原文\n\n~~取り消し~~\n\n- [x] 完了\n\n![画像](https://images.evame.tech/uploads/a)\n\n![参照][photo]\n\n[photo]: https://images.evame.tech/uploads/a",
			);
		const original = structuredClone(tree);
		const exported = serializeExportPage(
			metadata,
			tree,
			new Map([["https://images.evame.tech/uploads/a", "images/photo.jpg"]]),
		);
		expect(exported.filename).toBe("documents/42-my-note.md");
		expect(frontMatter(exported.markdown).attributes).toMatchObject({
			title: metadata.title,
			status: "DRAFT",
			comments_enabled: true,
			published_at: null,
		});
		expect(exported.markdown).toContain('status: "DRAFT"');
		expect(exported.markdown).toContain("published_at: null");
		expect(exported.markdown).toContain("## 原文");
		expect(exported.markdown).toContain("~~取り消し~~");
		expect(exported.markdown).toMatch(/[-*] \[x\] 完了/);
		expect(exported.markdown).toContain("![画像](../images/photo.jpg)");
		expect(exported.markdown).toContain("![参照](../images/photo.jpg)");
		expect(tree).toEqual(original);
		expect(metadata.tags).toEqual(["旅行", "日記"]);
	});
	it("画像と通常リンクが同じURLや参照定義を使っても、通常リンク先を変えない", () => {
		const source = "https://images.evame.tech/uploads/a";
		const tree = remark().parse(
			`![写真][photo]\n\n[原本を開く][photo]\n\n[別リンク][other]\n\n![直接画像](${source})\n\n[photo]: ${source} "写真の題名"\n\n[other]: ${source}`,
		);
		const { markdown } = serializeExportPage(
			metadata,
			tree,
			new Map([[source, "images/a.jpg"]]),
		);
		expect(markdown).toContain('![写真](../images/a.jpg "写真の題名")');
		expect(markdown).toContain("![直接画像](../images/a.jpg)");
		expect(markdown).toContain(`[photo]: ${source} "写真の題名"`);
		expect(markdown).toContain(`[other]: ${source}`);
	});
	it("同じ参照名が複数ある場合はCommonMarkと同じく最初の定義を使う", () => {
		const first = "https://images.evame.tech/uploads/first";
		const second = "https://images.evame.tech/uploads/second";
		const tree = remark().parse(
			`![写真][photo]\n\n[photo]: ${first}\n\n[photo]: ${second}`,
		);
		expect(getExportImageUrls(tree)).toEqual([first]);
		const { markdown } = serializeExportPage(
			metadata,
			tree,
			new Map([
				[first, "images/first.jpg"],
				[second, "images/second.jpg"],
			]),
		);
		expect(markdown).toContain("![写真](../images/first.jpg)");
		expect(markdown).not.toContain("![写真](../images/second.jpg)");
	});
	it.each([
		"../../private",
		"CON",
		"a/b\\c:*?",
		"",
		"あ".repeat(300),
		"𐐀".repeat(300),
	])("slug %s でもアーカイブ内の安全なファイル名にする", (slug) => {
		const { filename } = serializeExportPage(
			{ ...metadata, slug },
			{ type: "root", children: [] },
			new Map(),
		);
		expect(filename).toMatch(/^documents\/42-[^/\\:*?"<>|]+\.md$/);
		expect(filename).not.toContain("..");
		expect(new TextEncoder().encode(filename).length).toBeLessThan(240);
	});
	it("取得できなかった画像や生HTMLの原文は変更しない", () => {
		const tree: Root = remark().parse(
			"![外部](https://example.com/image.png)\n\n<div>残すHTML</div>",
		);
		const { markdown } = serializeExportPage(metadata, tree, new Map());
		expect(markdown).toContain("https://example.com/image.png");
		expect(markdown).toContain("<div>残すHTML</div>");
	});
});
