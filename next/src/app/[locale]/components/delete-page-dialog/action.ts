"use server";

import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { archivePage } from "./db/mutations.server";

export type ArchivePageState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
		auth?: string[];
	};
};

export async function archivePageAction(
	previousState: ArchivePageState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { fieldErrors: { auth: ["Authentication required"] } };
	}

	const pageIds = formData.get("pageIds")?.toString().split(",").map(Number);
	if (!pageIds?.length) {
		return { fieldErrors: { pageId: ["Page ID is required"] } };
	}

	for (const pageId of pageIds) {
		await archivePage(pageId, currentUser.id);
	}

	revalidatePath(`/user/${currentUser.handle}/`);
	return { success: true };
}
