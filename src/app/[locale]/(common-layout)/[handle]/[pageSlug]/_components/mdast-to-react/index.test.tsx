import { queryByAttribute } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { Tweet } from "react-tweet";
import { describe, expect, it, vi } from "vitest";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";

vi.mock("react-tweet", () => ({
	Tweet: ({ id }: { id: string }) => (
		<span data-testid={`tweet-${id}`}>Tweet ID: {id}</span>
	),
}));

vi.stubGlobal(
	"fetch",
	vi.fn().mockResolvedValue({
		ok: true,
		json: async () => [],
	}),
);

import { renderToStaticMarkup } from "react-dom/server";
// 2. その後で被テストモジュールをimport
import { mdastToReact } from "./index";

// テスト用のセグメントバンドル
const segments: Segment[] = Array.from(
	{ length: 5 },
	(_, i) =>
		({
			id: i + 1,
			contentId: 1,
			number: i + 1,
			text: "",
			translationText: null,
		}) as Segment,
);

describe("mdastToReact", () => {
	it("任意のCSSで画面を覆う属性を落とし、リンクカードのクラスだけを保つ", () => {
		const html = renderToStaticMarkup(
			mdastToReact({
				Tweet,
				segments: [],
				mdast: {
					type: "root",
					children: [
						{
							type: "html",
							value:
								'<div style="position:fixed;inset:0;z-index:2147483647" class="fixed inset-0 remark-link-card-plus__container"><a class="fixed remark-link-card-plus__card" href="https://example.com">本文</a></div>',
						},
					],
				},
			}),
		);
		expect(html).not.toContain("style=");
		expect(html).not.toContain("inset-0");
		expect(html).not.toContain("fixed");
		expect(html).toContain('class="remark-link-card-plus__container"');
		expect(html).toContain('class="remark-link-card-plus__card"');
	});
	it("許可したHTTPS動画埋め込みだけを表示し、任意の権限を与えない", () => {
		const html = renderToStaticMarkup(
			mdastToReact({
				Tweet,
				segments: [],
				mdast: {
					type: "root",
					children: [
						{
							type: "html",
							value:
								'<iframe src="https://www.youtube.com/embed/abc" allow="camera;microphone"></iframe><iframe src="https://evil.example/embed/abc"></iframe><iframe src="http://www.youtube.com/embed/abc"></iframe><iframe src="https://www.youtube.com.evil.example/embed/abc"></iframe>',
						},
					],
				},
			}),
		);
		expect(html).toContain('src="https://www.youtube.com/embed/abc"');
		expect(html).not.toContain("evil.example");
		expect(html).not.toContain('src="http:');
		expect(html).not.toContain("camera");
		expect(html).not.toContain("microphone");
	});
	it("埋め込み先が同じホストでも相対階層で別のパスへ移動させない", () => {
		const html = renderToStaticMarkup(
			mdastToReact({
				Tweet,
				segments: [],
				mdast: {
					type: "root",
					children: [
						{
							type: "html",
							value:
								'<iframe src="https://www.youtube.com/embed/../../redirect"></iframe><iframe src="https://player.vimeo.com/video/../redirect"></iframe>',
						},
					],
				},
			}),
		);
		expect(html).not.toContain("iframe");
	});
	it("Markdown由来のHTMLでもスクリプトとイベント属性を公開HTMLへ出さない", () => {
		const html = renderToStaticMarkup(
			mdastToReact({
				Tweet,
				segments: [],
				mdast: {
					type: "root",
					children: [
						{
							type: "html",
							value:
								'<script>alert(1)</script><img src="/safe.png" onerror="alert(2)"><p class="link-card">安全な本文</p>',
						},
					],
				},
			}),
		);
		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
		expect(html).toContain("安全な本文");
		expect(html).not.toContain('class="link-card"');
	});
	it("コメントの本文を同期的に描画し、元のASTを変更しない", () => {
		const mdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://x.com/example/status/123456789",
							children: [{ type: "text", value: "Tweet" }],
						},
					],
				},
			],
		};
		const before = structuredClone(mdast);
		const result = mdastToReact({ Tweet, mdast, segments: [] });
		expect(result).not.toBeInstanceOf(Promise);
		expect(mdast).toEqual(before);
		render(result as React.ReactElement);
		expect(screen.getByTestId("tweet-123456789")).toBeInTheDocument();
	});
	it("renders segments correctly", async () => {
		const mdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "heading",
					depth: 1,
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "abc" }],
				},
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "2" } },
					children: [{ type: "text", value: "def" }],
				},
			],
		};

		const el = await mdastToReact({ Tweet, mdast: mdast, segments });
		render(el);

		// セグメントが正しくレンダリングされているか確認
		expect(screen.getByText("abc")).toBeInTheDocument();
		expect(screen.getByText("def")).toBeInTheDocument();
	});

	it("converts Twitter/X links to XPost components", async () => {
		const mdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://twitter.com/user/status/1234567890",
							children: [{ type: "text", value: "Check this tweet" }],
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://x.com/user/status/9876543210",
							children: [{ type: "text", value: "Check this X post" }],
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://example.com/not-a-tweet",
							children: [{ type: "text", value: "Regular link" }],
						},
					],
				},
			],
		};

		const el = await mdastToReact({ Tweet, mdast: mdast, segments });
		render(el);

		// Twitterリンクが正しくXPostコンポーネントに変換されているか確認
		expect(screen.getByTestId("tweet-1234567890")).toBeInTheDocument();
		expect(screen.getByText("Tweet ID: 1234567890")).toBeInTheDocument();

		// X.comリンクも同様に変換されているか確認
		expect(screen.getByTestId("tweet-9876543210")).toBeInTheDocument();
		expect(screen.getByText("Tweet ID: 9876543210")).toBeInTheDocument();

		// 通常のリンクはそのままaタグとして残っているか確認
		expect(screen.getByText("Regular link")).toBeInTheDocument();
		const regularLink = screen.getByText("Regular link").closest("a");
		expect(regularLink).toHaveAttribute(
			"href",
			"https://example.com/not-a-tweet",
		);
	});
	it("renders different HTML elements correctly", async () => {
		const mdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "heading",
					depth: 1,
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "Heading 1" }],
				},
				{
					type: "heading",
					depth: 2,
					data: { hProperties: { "data-number-id": "2" } },
					children: [{ type: "text", value: "Heading 2" }],
				},
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "3" } },
					children: [{ type: "text", value: "Paragraph text" }],
				},
				{
					type: "list",
					ordered: true,
					children: [
						{
							type: "listItem",
							data: { hProperties: { "data-number-id": "4" } }, // ★ここ
							children: [
								{
									type: "paragraph",
									children: [{ type: "text", value: "List item" }],
								},
							],
						},
					],
				},
				{
					type: "blockquote",
					data: { hProperties: { "data-number-id": "5" } },
					children: [
						{
							type: "paragraph",
							children: [{ type: "text", value: "Blockquote text" }],
						},
					],
				},
			],
		};

		const el = await mdastToReact({ Tweet, mdast: mdast, segments });
		const { container } = render(el);

		const getByDataNumberId = (container: HTMLElement, id: number | string) =>
			queryByAttribute("data-number-id", container, id.toString());
		/* セグメントが存在するか */
		for (const n of [1, 2, 3, 4, 5]) {
			expect(getByDataNumberId(container, n)).toBeInTheDocument();
		}

		/* タグが正しいか */
		expect(
			container.querySelector('h1[data-number-id="1"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('h2[data-number-id="2"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('p[data-number-id="3"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('li[data-number-id="4"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('blockquote[data-number-id="5"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('ol li[data-number-id="4"]'),
		).toBeInTheDocument();
	});
});
