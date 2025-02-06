import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import DOMPurify from "isomorphic-dompurify";
import type { PreviewData } from "./types";

function extractMetaContent(html: string, property: string): string {
	const regex = new RegExp(
		`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`,
		"i",
	);
	const match = html.match(regex);
	return match ? match[1] : "";
}
function extractFavicon(html: string, baseUrl: string): string {
	const regex =
		/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["'][^>]*>/i;
	const match = html.match(regex);
	if (match) {
		const faviconPath = match[1];
		return new URL(faviconPath, baseUrl).href;
	}
	return new URL("/favicon.ico", baseUrl).href; // デフォルトのfaviconパス
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url).searchParams.get("url");
	if (!url) {
		return json({ error: "URL is required" }, { status: 400 });
	}

	try {
		const response = await fetch(url);
		const html = await response.text();

		let title = extractMetaContent(html, "og:title");
		let description = extractMetaContent(html, "og:description");
		let favicon = extractFavicon(html, url);
		let image = extractMetaContent(html, "og:image");
		const domain = new URL(url).hostname;

		if (!title) {
			const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
			title = titleMatch ? titleMatch[1] : "";
		}
		if (!image) {
			const imageMatch = html.match(
				/<meta[^>]*property=["']image["'][^>]*content=["']([^"']*)["'][^>]*>/i,
			);
			image = imageMatch ? imageMatch[1] : "";
		}
		// サニタイズ
		title = DOMPurify.sanitize(title);
		description = DOMPurify.sanitize(description);
		favicon = DOMPurify.sanitize(favicon);
		const previewData: PreviewData = {
			url,
			favicon,
			title,
			description,
			image,
			domain,
		};
		return json(previewData);
	} catch (error) {
		console.error("Error fetching link preview:", error);
		return json({ error: "Failed to fetch link preview" }, { status: 500 });
	}
}
