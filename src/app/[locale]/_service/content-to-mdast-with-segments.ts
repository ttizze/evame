import { getLocaleFromHtml } from "../_domain/get-locale-from-html";
import { htmlToMdastWithSegments } from "./html-to-mdast-with-segments";
import { markdownToMdastWithSegments } from "./markdown-to-mdast-with-segments";
import { mdastToHtml } from "./mdast-to-html";

/** 記事とコメントで同じ取り込み規則を使う。配信済みの旧フォームはHTMLを送る。 */
export async function contentToMdastWithSegments({
	content,
	contentFormat,
	header,
	userLocale,
}: {
	content: string;
	contentFormat: "html" | "markdown";
	header: string | null;
	userLocale: string;
}) {
	const result =
		contentFormat === "markdown"
			? await markdownToMdastWithSegments({
					header: header ?? "",
					markdown: content,
					autoUploadImages: true,
				})
			: await htmlToMdastWithSegments({ header, html: content });
	const { html } =
		contentFormat === "markdown"
			? await mdastToHtml({ mdastJson: result.mdastJson })
			: { html: content };
	const sourceLocale = await getLocaleFromHtml(html, userLocale);
	return {
		mdastJson: result.mdastJson,
		segments: result.segments,
		sourceLocale,
	};
}
