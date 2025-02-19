"use server";
import { getPageById } from "@/app/[locale]/db/queries.server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { upsertTags } from "../../db/mutations.server";

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
export type EditPageTagsActionState = ActionResponse<
	void,
	{
		pageId: number;
		tags: string[];
	}
>;

export async function editPageTagsAction(
	previousState: EditPageTagsActionState,
	formData: FormData,
): Promise<EditPageTagsActionState> {
	const parsedFormData = editPageTagsSchema.safeParse({
		pageId: formData.get("pageId"),
		tags: formData.get("tags"),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { pageId, tags } = parsedFormData.data;
	const page = await getPageById(pageId);
	const currentUser = await getCurrentUser();
	if (!currentUser?.id || page?.userId !== currentUser.id) {
		return redirect("/auth/login");
	}
	await upsertTags(tags, pageId);
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return { success: true };
}
