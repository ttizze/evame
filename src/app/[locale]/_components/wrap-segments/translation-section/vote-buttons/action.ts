// app/serverActions/voteAction.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/lib/auth-server";
import { parseFormData } from "@/lib/parse-form-data";
import {
	createNotificationPageSegmentTranslationVote,
	handleVote,
} from "./db/mutation.server";

const schema = z.object({
	segmentTranslationId: z.coerce.number().int(),
	isUpvote: z.string().transform((val) => val === "true"),
});

export type VoteTranslationActionResponse = ActionResponse<
	{ isUpvote?: boolean; point: number },
	{
		segmentTranslationId: number;
		isUpvote: boolean;
	}
>;
export async function voteTranslationAction(
	_previousState: VoteTranslationActionResponse,
	formData: FormData,
): Promise<VoteTranslationActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = await parseFormData(schema, formData);
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
	);
	if (isUpvote) {
		await createNotificationPageSegmentTranslationVote(
			parsedFormData.data.segmentTranslationId,
			currentUser.id,
		);
	}
	revalidatePath("/");
	return { success: true, data: { isUpvote, point } };
}
