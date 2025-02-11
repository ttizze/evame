// app/serverActions/voteAction.ts
"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VOTE_TARGET } from "./constants";
import { handleVote } from "./db/mutation.server";
const schema = z.object({
	segmentTranslationId: z.coerce.number().int(),
	isUpvote: z.string().transform((val) => val === "true"),
	voteTarget: z.enum([
		VOTE_TARGET.PAGE_SEGMENT_TRANSLATION,
		VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION,
	]),
});

export async function voteTranslationAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const parsedFormData = schema.safeParse({
		segmentTranslationId: formData.get("segmentTranslationId"),
		isUpvote: formData.get("isUpvote"),
		voteTarget: formData.get("voteTarget"),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	await handleVote(
		parsedFormData.data.segmentTranslationId,
		parsedFormData.data.isUpvote,
		currentUser.id,
		parsedFormData.data.voteTarget,
	);
	revalidatePath(`/user/${currentUser.handle}/page`);
	return { success: true };
}
