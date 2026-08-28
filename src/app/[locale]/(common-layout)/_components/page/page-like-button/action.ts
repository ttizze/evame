import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ActionResponse } from "@/app/types";
import type { LikeState } from "./service/like-api";

const schema = z.object({
	pageId: z.number().int().positive(),
});

export type PageLikeButtonState = ActionResponse<LikeState, { pageId: number }>;

export const togglePageLikeAction = createServerFn({ method: "POST" })
	.validator(schema)
	.handler(async ({ data }): Promise<PageLikeButtonState> => {
		const [{ getCurrentUserFromHeaders }, { togglePageLike }] =
			await Promise.all([
				import("@/app/_service/current-user"),
				import("./db/mutations.server"),
			]);
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser) {
			return { success: false };
		}
		const { liked, likeCount } = await togglePageLike(
			data.pageId,
			currentUser.id,
		);
		return {
			success: true,
			data: {
				liked,
				likeCount,
			},
		};
	});
