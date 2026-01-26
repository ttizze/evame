// app/serverActions/voteAction.ts
"use server";
import type { Route } from "next";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/app/_service/auth-server";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import type { ActionResponse } from "@/app/types";
import { findPageIdBySegmentTranslationId } from "../_db/queries.server";
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
		redirect("/auth/login" as Route);
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

	// Revalidate page for the current locale
	const pageId = await findPageIdBySegmentTranslationId(
		parsedFormData.data.segmentTranslationId,
	);
	updateTag(`page:${pageId}`);
	return { success: true, data: { isUpvote, point } };
}
