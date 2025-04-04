"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { upsertProjectTags } from "../../_db/tag-queries.server";

const editProjectTagsSchema = z.object({
	projectId: z.string().min(1, "Project ID is required"),
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
						"Symbols and spaces cannot be used",
					)
					.min(1, "Tag must be at least 1 character")
					.max(15, "Tag must not exceed 15 characters"),
			)
			.max(5, "Maximum 5 tags allowed"),
	),
});

export type EditProjectTagsActionState = ActionResponse<
	void,
	{
		projectId: string;
		tags: string[];
	}
>;

export async function editProjectTagsAction(
	previousState: EditProjectTagsActionState,
	formData: FormData,
): Promise<EditProjectTagsActionState> {
	const parsedFormData = editProjectTagsSchema.safeParse({
		projectId: formData.get("projectId"),
		tags: formData.get("tags"),
	});

	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}

	const { projectId, tags } = parsedFormData.data;
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: { user: true },
	});

	const currentUser = await getCurrentUser();
	if (!currentUser?.id || project?.userId !== currentUser.id) {
		return redirect("/auth/login");
	}

	await upsertProjectTags(tags, projectId);
	revalidatePath(`/user/${currentUser.handle}/project/${projectId}/edit`);

	return { success: true };
}
