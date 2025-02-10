"use server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertTags } from "../../db/mutations.server";

export type EditPageTagsActionState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
		tags?: string[];
	};
};

const editPageTagsSchema = z.object({
	pageId: z.coerce.number().min(1),
	tags: z.preprocess(
		(value) => {
			try {
				return JSON.parse(value as string);
			} catch {
				return [];
			}
		},
		z
			.array(
				z
					.string()
					.regex(
						/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/,
						"symbol and space can not be used",
					)
					.min(1, "tag can be min 1")
					.max(15, "tag can be max 15 characters"),
			)
			.max(5, "tags can be max 5"),
	),
});

export async function editPageTagsAction(
	previousState: EditPageTagsActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { generalError: "Unauthorized" };
	}
	const parsedFormData = editPageTagsSchema.safeParse({
		pageId: formData.get("pageId"),
		tags: formData.get("tags"),
	});
	if (!parsedFormData.success) {
		return { fieldErrors: parsedFormData.error.flatten().fieldErrors };
	}
	const { pageId, tags } = parsedFormData.data;
	await upsertTags(tags, pageId);
	revalidatePath("/user");
	return { success: true };
}
