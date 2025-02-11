"use server";
import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { togglePagePublicStatus } from "./db/mutations.server";

export type TogglePublishState = ActionResponse<
	void,
	{
		pageId: number;
	}
>;

// アクションハンドラー
export async function togglePublishAction(
	previousState: TogglePublishState,
	formData: FormData,
): Promise<TogglePublishState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const pageId = Number(formData.get("pageId"));
	if (!pageId) {
		return {
			success: false,
			zodErrors: { pageId: ["Page ID is required"] },
		};
	}

	await togglePagePublicStatus(pageId);
	revalidatePath(`/user/${currentUser?.handle}/page/${pageId}`);
	return { success: true, message: "Page published successfully" };
}
