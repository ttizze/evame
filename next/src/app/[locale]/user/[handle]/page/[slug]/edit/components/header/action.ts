"use server";
import { updatePageStatus } from "@/app/[locale]/user/[handle]/page/[slug]/edit/db/mutations.server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import type { PageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
const editPageStatusSchema = z.object({
	pageId: z.coerce.number().min(1),
	status: z.enum(["DRAFT", "PUBLIC", "ARCHIVE"]),
});

export type EditPageStatusActionState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
		status?: string[];
	};
};

export async function editPageStatusAction(
	previousState: EditPageStatusActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { generalError: "Unauthorized" };
	}
	const parsedFormData = editPageStatusSchema.safeParse({
		pageId: formData.get("pageId"),
		status: formData.get("status"),
	});
	console.log(parsedFormData);
	console.log(formData);
	console.log(parsedFormData.error?.flatten().fieldErrors);
	if (!parsedFormData.success) {
		return { fieldErrors: parsedFormData.error.flatten().fieldErrors };
	}
	const { pageId, status } = parsedFormData.data;
	await updatePageStatus(pageId, status as PageStatus);
	revalidatePath("/user");
	return { success: "true" };
}
