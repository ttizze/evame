"use server";
import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createFollow, deleteFollow } from "./db/mutations.server";
import { redirect } from "next/navigation";
export async function followAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}

	const targetUserId = formData.get("targetUserId");
	const action = formData.get("action");

	if (!targetUserId || typeof targetUserId !== "string") {
		return { success: false, message: "Invalid request" };
	}

	if (currentUser?.id === targetUserId) {
		return { success: false, message: "Cannot follow yourself" };
	}

	try {
		if (action === "follow") {
			await createFollow(currentUser.id, targetUserId);
		} else if (action === "unfollow") {
			await deleteFollow(currentUser.id, targetUserId);
		}
		revalidatePath("/");
		return { success: true };
	} catch (error) {
		console.error("Follow action error:", error);
		return { success: false, message: "Failed to process follow action" };
	}
}
