"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { archivePage } from "./db/mutations.server";
export async function archivePageAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}

	const pageIds = formData.get("pageIds")?.toString().split(",").map(Number);
	if (!pageIds?.length) {
		return { success: false, message: "Page ID is required" };
	}

	for (const pageId of pageIds) {
		try {
			await archivePage(pageId, currentUser.id);
		} catch (error) {
			console.error("Error archiving page", error);
			return { success: false, message: "Failed to archive page" };
		}
	}
	revalidatePath(`/user/${currentUser.handle}/`);
	return { success: true };
}
