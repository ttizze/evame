"use server";

import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { archivePage } from "./db/mutations.server";

export async function archivePageAction(
	previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { success: false, error: "Authentication required" };
	}

	const pageIds = formData.get("pageIds")?.toString().split(",").map(Number);
	if (!pageIds?.length) {
		return { success: false, error: "Page ID is required" };
	}

	for (const pageId of pageIds) {
		try {
			await archivePage(pageId, currentUser.id);
		} catch (error) {
			console.error("Error archiving page", error);
			return { success: false, error: "Failed to archive page" };
		}
	}
	revalidatePath(`/user/${currentUser.handle}/`);
	return { success: true };
}
