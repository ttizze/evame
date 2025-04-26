import { htmlToMdastWithSegments } from "@/app/[locale]/_lib/html-to-mdast-with-segments";
import { upsertProjectCommentAndSegments } from "../_db/mutations.server";

export async function processProjectCommentHtml(p: {
	projectCommentId?: number;
	parentId?: number;
	commentHtml: string;
	locale: string;
	userId: string;
	projectId: string;
}) {
	const { projectCommentId, commentHtml, locale, userId, projectId, parentId } =
		p;
	const { mdastJson, segments } = await htmlToMdastWithSegments({
		html: commentHtml,
	});
	const projectComment = await upsertProjectCommentAndSegments({
		projectId,
		projectCommentId,
		userId,
		mdastJson,
		sourceLocale: locale,
		segments,
		parentId,
	});
	return projectComment;
}
