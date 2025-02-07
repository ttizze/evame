"use server";

import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { archivePage } from "./db/mutations.server";

export type ArchivePageState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
	};
};

export async function archivePageAction(
	previousState: ArchivePageState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	const pageId = Number(formData.get("pageId"));
	if (!pageId) {
		return { fieldErrors: { pageId: ["Page ID is required"] } };
	}

	await archivePage(pageId);
	revalidatePath(`/user/${currentUser?.handle}/`);
	return { success: "Page archived successfully" };
}
