"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import type { PageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updatePageStatus } from "../../db/mutations.server";
import { getPageById } from "@/app/[locale]/db/queries.server";
const editPageStatusSchema = z.object({
	pageId: z.coerce.number().min(1),
	status: z.enum(["DRAFT", "PUBLIC", "ARCHIVE"]),
});

export type EditPageStatusActionState = ActionResponse<void, {
	pageId: number;
	status: string;
}>;

export async function editPageStatusAction(
	previousState: EditPageStatusActionState,
	formData: FormData,
): Promise<EditPageStatusActionState> {

	const parsedFormData = editPageStatusSchema.safeParse({
		pageId: formData.get("pageId"),
		status: formData.get("status"),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { pageId, status } = parsedFormData.data;
	const page = await getPageById(pageId);
	const currentUser = await getCurrentUser();
	if (!currentUser?.id ||  page?.userId !== currentUser.id) {
		redirect("/auth/login");
	}
	await updatePageStatus(pageId, status as PageStatus);
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return { success: true };
}
