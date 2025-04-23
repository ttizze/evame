import { annotateHtmlWithSegments } from "@/app/[locale]/_lib/annotate-html-with-segments";
import { upsertPageAndSegments } from "../_db/mutations.server";

// 例） HTML → HAST →MDAST → HAST → HTML の流れで使う想定
export async function processPageHtml(p: {
	title: string;
	html: string;
	pageId: number | undefined;
	slug: string;
	userId: string;
	sourceLocale: string;
}) {
	const { title, html, pageId, slug, userId, sourceLocale } = p;
	const { annotatedHtml, segments } = await annotateHtmlWithSegments({
		header: title,
		html,
	});
	const updatedPage = await upsertPageAndSegments({
		pageId,
		slug,
		userId,
		title,
		content: annotatedHtml,
		sourceLocale,
		segments,
	});
	return updatedPage;
}
