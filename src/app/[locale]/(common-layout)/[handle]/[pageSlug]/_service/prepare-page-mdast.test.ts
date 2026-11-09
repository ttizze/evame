import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { JsonValue } from "@/db/types";
import { mdastToReact } from "../_components/mdast-to-react";
import { preparePageMdast } from "./prepare-page-mdast";

// リンクカードは外部サイトへ通信するため、埋め込みの判定だけを検証する。
vi.mock("remark-link-card-plus", () => ({ default: () => () => {} }));

afterEach(() => vi.unstubAllGlobals());

function stubOembedProviders() {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL) => {
			const url = input.toString();
			if (url === "https://oembed.com/providers.json")
				return Response.json([
					{
						provider_name: "CodePen",
						provider_url: "https://codepen.io",
						endpoints: [
							{
								schemes: ["https://codepen.io/*"],
								url: "https://codepen.io/api/oembed",
							},
						],
					},
					{
						provider_name: "YouTube",
						provider_url: "https://www.youtube.com",
						endpoints: [
							{
								schemes: ["https://www.youtube.com/watch*"],
								url: "https://www.youtube.com/oembed",
							},
						],
					},
				]);
			if (url.startsWith("https://codepen.io/api/oembed"))
				return Response.json({
					html: '<iframe src="https://codepen.io/a/embed/b"></iframe>',
				});
			if (url.startsWith("https://www.youtube.com/oembed"))
				return Response.json({
					html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
				});
			return new Response(null, { status: 404 });
		}),
	);
}

async function publishedHtml(url: string) {
	const page: JsonValue = {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [
					{ type: "link", url, children: [{ type: "text", value: url }] },
				],
			},
		],
	};
	return renderToStaticMarkup(
		mdastToReact({
			mdast: await preparePageMdast(page),
			segments: [],
			Tweet: () => null,
		}),
	);
}

it("埋め込みを表示できないサービスのURLは本文から消さずリンクのまま残す", async () => {
	stubOembedProviders();
	expect(await publishedHtml("https://codepen.io/a/pen/b")).toContain(
		'href="https://codepen.io/a/pen/b"',
	);
});

it("埋め込みを表示できるYouTubeのURLはプレーヤーを表示する", async () => {
	stubOembedProviders();
	expect(await publishedHtml("https://www.youtube.com/watch?v=abc")).toContain(
		'src="https://www.youtube.com/embed/abc"',
	);
});
