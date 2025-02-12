"use server";
import { getPageById } from "@/app/[locale]/db/queries.server";
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

export async function togglePublishAction(
	previousState: TogglePublishState,
	formData: FormData,
): Promise<TogglePublishState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const pageId = Number(formData.get("pageId"));
	if (!pageId) {
		return {
			success: false,
			zodErrors: { pageId: ["Page ID is required"] },
		};
	}
	const page = await getPageById(pageId);
	if (!page || page.userId !== currentUser.id) {
		return {
			success: false,
			zodErrors: { pageId: ["Page not found"] },
		};
	}
	await togglePagePublicStatus(pageId);
	revalidatePath(`/user/${currentUser?.handle}/page/${pageId}`);
	return { success: true, message: "Page updated successfully" };
}
