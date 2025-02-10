// app/serverActions/voteAction.ts
"use server";

import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
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
	previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const parsedFormData = await parseVoteForm(formData);
	await handleVote(
		parsedFormData.segmentTranslationId,
		parsedFormData.isUpvote,
		currentUser.id,
		parsedFormData.voteTarget,
	);
	revalidatePath(`/user/${currentUser.handle}/page`);
	return { success: true };
}

export async function parseVoteForm(formData: FormData) {
	const result = schema.safeParse({
		segmentTranslationId: formData.get("segmentTranslationId"),
		isUpvote: formData.get("isUpvote"),
		voteTarget: formData.get("voteTarget"),
	});
	if (!result.success) {
		throw new Error(result.error.message);
	}
	return result.data;
}
