import { htmlToMdastWithSegments } from "@/app/[locale]/_lib/html-to-mdast-with-segments";
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
	const { mdastJson, segments } = await htmlToMdastWithSegments({
		header: title,
		html,
	});
	const updatedPage = await upsertPageAndSegments({
		pageId,
		slug,
		userId,
		title,
		mdastJson,
		sourceLocale,
		segments,
	});
	return updatedPage;
}
