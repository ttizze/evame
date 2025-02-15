"use server";

import { getPageById } from "@/app/[locale]/db/queries.server";
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
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const pageIds = formData.get("pageIds")?.toString().split(",").map(Number);
	if (!pageIds?.length) {
		return { success: false, message: "Page ID is required" };
	}

	for (const pageId of pageIds) {
		const page = await getPageById(pageId);
		if (!page || page.userId !== currentUser.id) {
			return { success: false, message: "Page not found" };
		}
		await archivePage(pageId, currentUser.id);
	}
	revalidatePath(`/user/${currentUser.handle}/`);
	return { success: true };
}
