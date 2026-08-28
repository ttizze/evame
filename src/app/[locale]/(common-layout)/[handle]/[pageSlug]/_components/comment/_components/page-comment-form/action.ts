import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getLocaleFromHtml } from "@/app/[locale]/_domain/get-locale-from-html";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { db } from "@/db";
import { createNotificationPageComment } from "./_db/mutations.server";
import { processPageCommentHtml } from "./service/process-page-comment-html";

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
	parentId: z.number().int().positive().optional(),
	pageCommentId: z.number().int().positive().optional(),
});

export type CommentActionResponse = ActionResponse<
	{ translationJobs: TranslationJobForToast[] },
	{
		pageId: number;
		userLocale: string;
		content: string;
		parentId?: number;
		pageCommentId?: number;
	}
>;

export const commentAction = createServerFn({ method: "POST" })
	.validator(commentActionInput)
	.handler(async ({ data }): Promise<CommentActionResponse> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
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

		const locale = await getLocaleFromHtml(data.content, data.userLocale);
		const pageComment = await processPageCommentHtml({
			pageCommentId: data.pageCommentId,
			parentId: data.parentId,
			commentHtml: data.content,
			locale,
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
			annotationContentId: null,
			translationContext: "",
		});

		return {
			success: true,
			data: { translationJobs },
		};
	});
