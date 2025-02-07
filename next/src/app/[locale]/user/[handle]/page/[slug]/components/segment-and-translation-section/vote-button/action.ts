// app/serverActions/voteAction.ts
"use server";

import { auth } from "@/auth";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { handleVote } from "../../../../resources+/functions/mutations.server";

export enum VoteIntent {
	PAGE_SEGMENT_TRANSLATION = "pageSegmentTranslation",
	COMMENT_SEGMENT_TRANSLATION = "commentSegmentTranslation",
}

const schema = z.object({
	segmentTranslationId: z.number(),
	isUpvote: z.preprocess((val) => val === "true", z.boolean()),
	intent: z.nativeEnum(VoteIntent),
});

export async function voteAction(formData: FormData) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		throw new Error("Unauthorized");
	}

	const submission = parseWithZod(formData, { schema });
	if (submission.status !== "success") {
		throw new Error("バリデーションエラー");
	}

	await handleVote(
		submission.value.segmentTranslationId,
		submission.value.isUpvote,
		currentUser.id,
		submission.value.intent,
	);

	return submission.reply({ resetForm: true });
}
