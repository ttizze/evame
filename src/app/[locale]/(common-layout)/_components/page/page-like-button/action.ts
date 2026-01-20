"use server";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { togglePageLike } from "./db/mutations.server";
import type { LikeState } from "./service/like-api";

// フォームデータ用のスキーマ
const schema = z.object({
	pageId: z.coerce.number(),
});

export type PageLikeButtonState = ActionResponse<LikeState, { pageId: number }>;

export async function togglePageLikeAction(
	_previousState: PageLikeButtonState,
	formData: FormData,
): Promise<PageLikeButtonState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = await v;
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
