import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { deletePageComment } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/page-comment-item/_db/mutations.server";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";

const deleteCommentInput = z.object({
	pageCommentId: z.number().int().positive(),
	pageId: z.number().int().positive(),
	locale: z.string().min(2),
});

export type CommentDeleteActionResponse = ActionResponse<
	{ pageCommentId: number; pageId: number; locale: string },
	{ pageCommentId: number; pageId: number; locale: string }
>;

export async function deletePageCommentAction(
	input: z.input<typeof deleteCommentInput>,
	requestHeaders: Headers,
): Promise<CommentDeleteActionResponse> {
	const data = deleteCommentInput.parse(input);

	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
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
}
