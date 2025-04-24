import type { SegmentBundle } from "@/app/[locale]/types";
import type { Prisma } from "@prisma/client";
import { queryByAttribute } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import type { Root } from "mdast";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/_context/display-provider", () => ({
	useDisplay: () => ({ mode: "source" }), // ← dummy 値
}));
vi.mock("react-tweet", () => ({
	Tweet: ({ id }: { id: string }) => (
		<span data-testid={`tweet-${id}`}>Tweet ID: {id}</span>
	),
}));

// 2. その後で被テストモジュールをimport
import { mdastToReact } from "./mdast-to-react";

// テスト用のセグメントバンドル
const bundles: SegmentBundle[] = [
	{
		parentType: "page",
		parentId: 1,
		segment: { id: 10, number: 1, text: "abc" },
		translations: [],
		best: null,
	},
	{
		parentType: "page",
		parentId: 1,
		segment: { id: 11, number: 2, text: "def" },
		translations: [],
		best: null,
	},
];

describe("mdastToReact", () => {
	it("renders segments correctly", async () => {
		const mdast: Root = {
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

		const el = await mdastToReact({
			mdast: mdast as unknown as Prisma.JsonValue,
			bundles,
		});
		render(el);

		// セグメントが正しくレンダリングされているか確認
		expect(screen.getByText("abc")).toBeInTheDocument();
		expect(screen.getByText("def")).toBeInTheDocument();
	});

	it("converts Twitter/X links to XPost components", async () => {
		const mdast: Root = {
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

		const el = await mdastToReact({
			mdast: mdast as unknown as Prisma.JsonValue,
			bundles,
		});
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
		const mdast: Root = {
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

		const testBundles: SegmentBundle[] = [
			{
				parentType: "page",
				parentId: 1,
				segment: { id: 1, number: 1, text: "Heading 1" },
				translations: [],
				best: null,
			},
			{
				parentType: "page",
				parentId: 1,
				segment: { id: 2, number: 2, text: "Heading 2" },
				translations: [],
				best: null,
			},
			{
				parentType: "page",
				parentId: 1,
				segment: { id: 3, number: 3, text: "Paragraph text" },
				translations: [],
				best: null,
			},
			{
				parentType: "page",
				parentId: 1,
				segment: { id: 4, number: 4, text: "List item" },
				translations: [],
				best: null,
			},
			{
				parentType: "page",
				parentId: 1,
				segment: { id: 5, number: 5, text: "Blockquote text" },
				translations: [],
				best: null,
			},
		];

		const el = await mdastToReact({
			mdast: mdast as unknown as Prisma.JsonValue,
			bundles: testBundles,
		});
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
