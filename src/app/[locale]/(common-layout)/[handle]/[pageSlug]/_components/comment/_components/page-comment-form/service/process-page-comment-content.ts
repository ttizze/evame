import { contentToMdastWithSegments } from "@/app/[locale]/_service/content-to-mdast-with-segments";
import { upsertPageCommentAndSegments } from "./upsert-page-comment-and-segments";

/** HTMLまたはMarkdownを共通本文へ変換し、コメントと照合用セグメントを保存する。 */
export async function processPageCommentContent(input: {
	pageCommentId?: number;
	parentId?: number;
	content: string;
	contentFormat: "html" | "markdown";
	userLocale: string;
	currentUserId: string;
	pageId: number;
}) {
	const { mdastJson, segments, sourceLocale } =
		await contentToMdastWithSegments({
			header: null,
			content: input.content,
			contentFormat: input.contentFormat,
			userLocale: input.userLocale,
		});

	return upsertPageCommentAndSegments({
		pageId: input.pageId,
		pageCommentId: input.pageCommentId,
		currentUserId: input.currentUserId,
		mdastJson,
		sourceLocale,
		segments,
		parentId: input.parentId,
	});
}
