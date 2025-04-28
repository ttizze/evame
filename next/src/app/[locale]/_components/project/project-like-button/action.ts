"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toggleProjectLike } from "./db/mutations.server";

// Form data schema
const schema = z.object({
	projectId: z.coerce.number().min(1),
});

export type ProjectLikeButtonState = ActionResponse<
	{
		liked: boolean;
		likeCount: number;
	},
	{
		projectId: string;
	}
>;

export async function toggleProjectLikeAction(
	previousState: ProjectLikeButtonState,
	formData: FormData,
): Promise<ProjectLikeButtonState> {
	const parsedData = schema.safeParse({ projectId: formData.get("projectId") });
	if (!parsedData.success) {
		return {
			success: false,
			zodErrors: parsedData.error.flatten().fieldErrors,
		};
	}

	const projectId = parsedData.data.projectId;
	const currentUser = await getCurrentUser();

	if (!currentUser || !currentUser.id) {
		return {
			success: false,
		};
	}

	const { liked, likeCount } = await toggleProjectLike(
		projectId,
		currentUser.id,
	);
	revalidatePath("/projects");
	revalidatePath(`/projects/${projectId}`);

	return {
		success: true,
		data: {
			liked,
			likeCount,
		},
	};
}
