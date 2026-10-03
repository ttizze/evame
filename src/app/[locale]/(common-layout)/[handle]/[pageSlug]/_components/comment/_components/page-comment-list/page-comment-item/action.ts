import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";
import { deletePageComment } from "./_db/mutations.server";

const deleteCommentInput = z.object({
	pageCommentId: z.number().int().positive(),
	pageId: z.number().int().positive(),
	locale: z.string().min(2),
});

export type CommentDeleteActionResponse = ActionResponse<
	{ pageCommentId: number; pageId: number; locale: string },
	{ pageCommentId: number; pageId: number; locale: string }
>;

export const deletePageCommentAction = createServerFn({ method: "POST" })
	.validator(deleteCommentInput)
	.handler(async ({ data }): Promise<CommentDeleteActionResponse> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser) {
			throw redirect({ href: `/${data.locale}/auth/login` });
		}

		const page = await db
			.selectFrom("pages")
			.select(["status", "userId"])
			.where("id", "=", data.pageId)
			.executeTakeFirst();
		if (!page || (page.status !== "PUBLIC" && page.userId !== currentUser.id)) {
			return { success: false, message: "Page not found" };
		}

		await deletePageComment(data.pageCommentId, currentUser.id);
		return {
			success: true,
			data: {
				pageCommentId: data.pageCommentId,
				pageId: data.pageId,
				locale: data.locale,
			},
		};
	});
