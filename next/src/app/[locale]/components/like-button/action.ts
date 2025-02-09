"use server";

import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toggleLike } from "./db/mutations.server";
// フォームデータ用のスキーマ
const schema = z.object({
	slug: z.string(),
});

export type LikeButtonState = ActionState & {
	liked?: boolean;
	fieldErrors?: {
		slug: string;
	};
};

export async function toggleLikeAction(
	previousState: LikeButtonState,
	formData: FormData,
) {
	const validation = schema.safeParse({ slug: formData.get("slug") });
	if (!validation.success) {
		return { fieldErrors: { slug: "Invalid slug parameter provided" } };
	}
	const slug = validation.data.slug;
	const session = await auth();
	const currentUser = session?.user;
	const guestId = !currentUser ? await getGuestId() : undefined;
	const liked = await toggleLike(slug, currentUser?.id, guestId);
	revalidatePath("/");
	return {
		success: "mutation liked",
		liked,
	};
}
