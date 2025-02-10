"use server";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { togglePagePublicStatus } from "./db/mutations.server";

export type TogglePublishState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
	};
};

// アクションハンドラー
export async function togglePublishAction(
	previousState: TogglePublishState,
	formData: FormData,
): Promise<TogglePublishState> {
	const session = await auth();
	const currentUser = session?.user;
	const pageId = Number(formData.get("pageId"));
	if (!pageId) {
		return { fieldErrors: { pageId: ["Page ID is required"] } };
	}

	await togglePagePublicStatus(pageId);
	revalidatePath(`/user/${currentUser?.handle}/page/${pageId}`);
	return { success: true, message: "Page published successfully" };
}
