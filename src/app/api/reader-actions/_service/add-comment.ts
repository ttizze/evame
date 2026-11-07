import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import { createNotificationPageComment } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/_db/mutations.server";
import { processPageCommentContent } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/service/process-page-comment-content";
import { COMMENT_PAGE_SIZE } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/constants";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { db } from "@/db";

const commentActionInput = z.object({
	pageId: z.number().int().positive(),
	userLocale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	content: z.string().trim().min(1, "Comment cannot be empty"),
	contentFormat: z.enum(["html", "markdown"]).default("html"),
	parentId: z.number().int().positive().optional(),
	pageCommentId: z.number().int().positive().optional(),
});

export type CommentActionResponse = ActionResponse<
	{ translationJobs: TranslationJobForToast[]; commentPage: number | null },
	{
		pageId: number;
		userLocale: string;
		content: string;
		parentId?: number;
		pageCommentId?: number;
	}
>;

export async function commentAction(
	input: z.input<typeof commentActionInput>,
	requestHeaders: Headers,
): Promise<CommentActionResponse> {
	const data = commentActionInput.parse(input);

	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
	if (!currentUser) {
		throw redirect({ href: `/${data.userLocale}/auth/login` });
	}

	const page = await getPageById(data.pageId);
	if (!page) return { success: false, message: "Page not found" };
	if (page.status !== "PUBLIC" && page.user.id !== currentUser.id) {
		return { success: false, message: "Page not found" };
	}

	if (data.parentId !== undefined) {
		const parent = await db
			.selectFrom("pageComments")
			.select(["pageId", "isDeleted"])
			.where("id", "=", data.parentId)
			.executeTakeFirst();
		if (!parent || parent.pageId !== data.pageId || parent.isDeleted) {
			return { success: false, message: "Comment not found" };
		}
	}

	if (data.pageCommentId !== undefined) {
		const existing = await db
			.selectFrom("pageComments")
			.select(["pageId", "userId", "isDeleted"])
			.where("id", "=", data.pageCommentId)
			.executeTakeFirst();
		if (
			!existing ||
			existing.pageId !== data.pageId ||
			existing.userId !== currentUser.id ||
			existing.isDeleted
		) {
			return { success: false, message: "Comment not found" };
		}
	}

	const pageComment = await processPageCommentContent({
		pageCommentId: data.pageCommentId,
		parentId: data.parentId,
		content: data.content,
		contentFormat: data.contentFormat,
		userLocale: data.userLocale,
		currentUserId: currentUser.id,
		pageId: data.pageId,
	});

	await createNotificationPageComment(
		currentUser.id,
		page.user.id,
		pageComment.id,
	);

	const translationJobs = await enqueueTranslationJob({
		currentUserId: currentUser.id,
		pageCommentId: pageComment.id,
		pageId: data.pageId,
		targetLocales: ["en", "zh"],
		aiModel: "gemini-2.5-flash-lite",
		translationContext: "",
	});

	let commentPage: number | null = null;
	if (data.parentId === undefined && data.pageCommentId === undefined) {
		const roots = await db
			.selectFrom("pageComments")
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.where("pageId", "=", data.pageId)
			.where("parentId", "is", null)
			.where((eb) =>
				eb.or([
					eb("createdAt", "<", pageComment.createdAt),
					eb.and([
						eb("createdAt", "=", pageComment.createdAt),
						eb("id", "<=", pageComment.id),
					]),
				]),
			)
			.executeTakeFirstOrThrow();
		commentPage = Math.ceil(roots.count / COMMENT_PAGE_SIZE);
	}
	return {
		success: true,
		data: { translationJobs, commentPage },
	};
}
