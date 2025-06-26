"use server";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import {
	createFollow,
	createNotificationFollow,
	deleteFollow,
} from "./db/mutations.server";

const followActionSchema = z.object({
	targetUserId: z.string(),
	action: z.string(),
});

export type FollowActionResponse = ActionResponse<
	{ isFollowing: boolean },
	{
		targetUserId: string;
		action: string;
	}
>;
export async function followAction(
	previousState: FollowActionResponse,
	formData: FormData,
): Promise<FollowActionResponse> {
	const v = await authAndValidate(followActionSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;
	const { targetUserId, action } = data;
	if (currentUser?.id === targetUserId) {
		return { success: false, message: "Cannot follow yourself" };
	}

	let isFollowing = false;
	if (action === "follow") {
		await createFollow(currentUser.id, targetUserId);
		await createNotificationFollow(currentUser.id, targetUserId);
		isFollowing = true;
	} else if (action === "unFollow") {
		await deleteFollow(currentUser.id, targetUserId);
		isFollowing = false;
	}
	return { success: true, data: { isFollowing } };
}
