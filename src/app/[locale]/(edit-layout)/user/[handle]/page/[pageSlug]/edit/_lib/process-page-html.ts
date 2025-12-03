import { htmlToMdastWithSegments } from "@/app/[locale]/_lib/html-to-mdast-with-segments";
import { upsertPageAndSegments } from "../_db/mutations.server";

// 例） HTML → HAST →MDAST → HAST → HTML の流れで使う想定
export async function processPageHtml(params: {
	title: string;
	html: string;
	pageSlug: string;
	userId: string;
	sourceLocale: string;
}) {
	const { mdastJson, segments } = await htmlToMdastWithSegments({
		header: params.title,
		html: params.html,
	});
	const updatedPage = await upsertPageAndSegments({
		pageSlug: params.pageSlug,
		userId: params.userId,
		title: params.title,
		mdastJson,
		sourceLocale: params.sourceLocale,
		segments,
	});
	return updatedPage;
}
