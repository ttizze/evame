"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createFollow, deleteFollow } from "./db/mutations.server";

const followActionSchema = z.object({
	targetUserHandle: z.string(),
	action: z.string(),
});

export type FollowActionResponse = ActionResponse<
	{ isFollowing: boolean },
	{
		targetUserHandle: string;
		action: string;
	}
>;
export async function followAction(
	previousState: FollowActionResponse,
	formData: FormData,
): Promise<FollowActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}

	const parsedFormData = followActionSchema.safeParse({
		targetUserHandle: formData.get("targetUserHandle"),
		action: formData.get("action"),
	});

	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { targetUserHandle, action } = parsedFormData.data;

	if (currentUser?.handle === targetUserHandle) {
		return { success: false, message: "Cannot follow yourself" };
	}

	try {
		let isFollowing = false;
		if (action === "follow") {
			await createFollow(currentUser.handle, targetUserHandle);
			isFollowing = true;
		} else if (action === "unFollow") {
			await deleteFollow(currentUser.handle, targetUserHandle);
			isFollowing = false;
		}
		return { success: true, data: { isFollowing } };
	} catch (error) {
		console.error("Follow action error:", error);
		return { success: false, message: "Failed to process follow action" };
	}
}
