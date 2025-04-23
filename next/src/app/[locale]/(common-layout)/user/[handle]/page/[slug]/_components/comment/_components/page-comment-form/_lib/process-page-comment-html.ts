import { annotateHtmlWithSegments } from "@/app/[locale]/_lib/annotate-html-with-segments";
import { upsertPageCommentAndSegments } from "../_db/mutations.server";

export async function processPageCommentHtml(p: {
	pageCommentId?: number;
	parentId?: number;
	commentHtml: string;
	locale: string;
	userId: string;
	pageId: number;
}) {
	const { pageCommentId, commentHtml, locale, userId, pageId, parentId } = p;
	const { annotatedHtml, segments } = await annotateHtmlWithSegments({
		html: commentHtml,
	});
	const pageComment = await upsertPageCommentAndSegments({
		pageId,
		pageCommentId,
		userId,
		content: annotatedHtml,
		sourceLocale: locale,
		segments,
		parentId,
	});
	return pageComment;
}
