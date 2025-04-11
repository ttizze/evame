"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import { setGuestId } from "@/lib/set-guest-id-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { togglePageLike } from "./db/mutations.server";
// フォームデータ用のスキーマ
const schema = z.object({
	slug: z.string(),
});

export type PageLikeButtonState = ActionResponse<
	{
		liked: boolean;
		likeCount: number;
	},
	{
		slug: string;
	}
>;

export async function togglePageLikeAction(
	previousState: PageLikeButtonState,
	formData: FormData,
): Promise<PageLikeButtonState> {
	const validation = schema.safeParse({ slug: formData.get("slug") });
	if (!validation.success) {
		return {
			success: false,
			zodErrors: validation.error.flatten().fieldErrors,
		};
	}
	const slug = validation.data.slug;
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		const guestId = (await getGuestId()) ?? (await setGuestId());
		const { liked, likeCount } = await togglePageLike(slug, {
			type: "guest",
			id: guestId,
		});
		revalidatePath("/");
		return {
			success: true,
			data: {
				liked,
				likeCount,
			},
		};
	}

	const { liked, likeCount } = await togglePageLike(slug, {
		type: "user",
		id: currentUser.id,
	});
	revalidatePath("/");
	return {
		success: true,
		data: {
			liked,
			likeCount,
		},
	};
}
