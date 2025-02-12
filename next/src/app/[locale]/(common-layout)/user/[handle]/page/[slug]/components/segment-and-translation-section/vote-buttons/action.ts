// app/serverActions/voteAction.ts
"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VOTE_TARGET, type VoteTarget } from "./constants";
import { handleVote } from "./db/mutation.server";
const schema = z.object({
	segmentTranslationId: z.coerce.number().int(),
	isUpvote: z.string().transform((val) => val === "true"),
	voteTarget: z.enum([
		VOTE_TARGET.PAGE_SEGMENT_TRANSLATION,
		VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION,
	]),
});

export type VoteTranslationActionResponse = ActionResponse<
	{ isUpvote?: boolean; point: number },
	{
		segmentTranslationId: number;
		isUpvote: boolean;
		voteTarget: VoteTarget;
	}
>;
export async function voteTranslationAction(
	previousState: VoteTranslationActionResponse,
	formData: FormData,
): Promise<VoteTranslationActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
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
	const {
		data: { isUpvote, point },
	} = await handleVote(
		parsedFormData.data.segmentTranslationId,
		parsedFormData.data.isUpvote,
		currentUser.id,
		parsedFormData.data.voteTarget,
	);
	revalidatePath("/");
	return { success: true, data: { isUpvote, point } };
}
