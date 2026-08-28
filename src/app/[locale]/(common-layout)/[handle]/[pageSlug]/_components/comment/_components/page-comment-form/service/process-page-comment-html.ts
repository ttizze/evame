import { htmlToMdastWithSegments } from "@/app/[locale]/_domain/html-to-mdast-with-segments";
import { upsertPageCommentAndSegments } from "./upsert-page-comment-and-segments";

export async function processPageCommentHtml(input: {
	pageCommentId?: number;
	parentId?: number;
	commentHtml: string;
	locale: string;
	currentUserId: string;
	pageId: number;
}) {
	const { mdastJson, segments } = await htmlToMdastWithSegments({
		html: input.commentHtml,
	});

	return upsertPageCommentAndSegments({
		pageId: input.pageId,
		pageCommentId: input.pageCommentId,
		currentUserId: input.currentUserId,
		mdastJson,
		sourceLocale: input.locale,
		segments,
		parentId: input.parentId,
	});
}
