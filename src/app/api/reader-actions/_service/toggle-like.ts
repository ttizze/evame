import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { togglePageLike } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/db/mutations.server";
import type { LikeState } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/service/like-api";
import type { ActionResponse } from "@/app/types";

const schema = z.object({
	pageId: z.number().int().positive(),
});

export type PageLikeButtonState = ActionResponse<LikeState, { pageId: number }>;

export async function togglePageLikeAction(
	input: z.input<typeof schema>,
	requestHeaders: Headers,
): Promise<PageLikeButtonState> {
	const data = schema.parse(input);
	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
	if (!currentUser) {
		throw new Response(null, { status: 401 });
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
}
