"use server";

import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { ensureGuestId } from "@/lib/ensureGuestId.server";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { toggleLike } from "./db/mutations.server";
// フォームデータ用のスキーマ
const schema = z.object({
	slug: z.string(),
});

export async function toggleLikeAction(
	previousState: ActionState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	console.log("currentUser", currentUser);
	const guestId = await ensureGuestId();

	const submission = parseWithZod(formData, { schema });
	if (submission.status !== "success") {
		throw new Error("error");
	}
	const slug = submission.value.slug;
	const liked = await toggleLike(slug, currentUser?.id, guestId);

	return {
		success: "いいねしました",
		liked,
	};
}
