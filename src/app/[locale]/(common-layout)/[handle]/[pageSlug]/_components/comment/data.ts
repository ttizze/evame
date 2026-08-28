import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import type { PageCommentWithSegments } from "./_components/page-comment-list/_db/queries.server";
import { fetchPageCommentsWithSegments } from "./_components/page-comment-list/_db/queries.server";
import { buildCommentTree } from "./_components/page-comment-list/_lib/fetch-page-comments-with-user-and-translations";

const commentDataInput = z.object({
	pageId: z.number().int().positive(),
	userLocale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});

export type PageCommentsData = {
	comments: PageCommentWithSegments[];
	count: number;
};

/**
 * 公開ページのコメントを取得する。
 *
 * コメントはページ本文と同じリクエストで取得し、mutation 後は route の
 * invalidate でこの server function を再実行する。公開ページ以外は本文と
 * 同じく所有者だけに限定する。
 */
export const getPageComments = createServerFn({ method: "GET" })
	.validator(commentDataInput)
	.handler(async ({ data }): Promise<PageCommentsData> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const page = await db
			.selectFrom("pages")
			.select(["status", "userId"])
			.where("id", "=", data.pageId)
			.executeTakeFirst();

		if (!page) return { comments: [], count: 0 };

		if (page.status !== "PUBLIC") {
			const currentUser = await getCurrentUserFromHeaders(
				new Headers(getRequestHeaders()),
			);
			if (!currentUser || currentUser.id !== page.userId) {
				return { comments: [], count: 0 };
			}
		}

		const comments = await fetchPageCommentsWithSegments(
			data.pageId,
			data.userLocale,
		);
		const tree = buildCommentTree(comments);

		return {
			comments: tree,
			count: comments.filter((comment) => !comment.isDeleted).length,
		};
	});
