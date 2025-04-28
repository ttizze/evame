"use server";

import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toggleProjectLike } from "./db/mutations.server";
// Form data schema
const schema = z.object({
	projectId: z.coerce.number().min(1),
	projectSlug: z.string().min(1),
	ownerHandle: z.string().min(1),
});

export type ProjectLikeButtonState = ActionResponse<
	{
		liked: boolean;
		likeCount: number;
	},
	{
		projectId: string;
		projectSlug: string;
		ownerHandle: string;
	}
>;

export async function toggleProjectLikeAction(
	previousState: ProjectLikeButtonState,
	formData: FormData,
): Promise<ProjectLikeButtonState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = await v;

	const { liked, likeCount } = await toggleProjectLike(
		data.projectId,
		currentUser.id,
	);
	revalidatePath(`/user/${data.ownerHandle}/project/${data.projectSlug}`);

	return {
		success: true,
		data: {
			liked,
			likeCount,
		},
	};
}
