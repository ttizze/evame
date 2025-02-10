"use server";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createFollow, deleteFollow } from "./db/mutations.server";

export async function followAction(
	previousState: ActionState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		throw new Error("Unauthorized");
	}

	const targetUserId = formData.get("targetUserId");
	const action = formData.get("action");

	if (!targetUserId || typeof targetUserId !== "string") {
		throw new Error("Invalid request");
	}

	if (currentUser?.id === targetUserId) {
		throw new Error("Cannot follow yourself");
	}

	try {
		if (action === "follow") {
			await createFollow(currentUser.id, targetUserId);
		} else if (action === "unfollow") {
			await deleteFollow(currentUser.id, targetUserId);
		}
		revalidatePath("/");
		return { success: "true" };
	} catch (error) {
		console.error("Follow action error:", error);
		return { error: "Failed to process follow action" };
	}
}
