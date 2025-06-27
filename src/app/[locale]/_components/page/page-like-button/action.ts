"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { togglePageLike } from "./db/mutations.server";

// フォームデータ用のスキーマ
const schema = z.object({
	pageId: z.coerce.number(),
	pageSlug: z.string().min(1),
	ownerHandle: z.string().min(1),
});

export type PageLikeButtonState = ActionResponse<
	{
		liked: boolean;
		likeCount: number;
	},
	{
		pageId: number;
		pageSlug: string;
		ownerHandle: string;
	}
>;

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
	revalidatePath(`/user/${data.ownerHandle}/page/${data.pageSlug}`);
	return {
		success: true,
		data: {
			liked,
			likeCount,
		},
	};
}
