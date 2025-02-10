"use server";
import { uploadImage } from "@/app/[locale]/lib/upload";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateUser, updateUserImage } from "./db/mutations.server";
import reservedHandles from "./reserved-handles.json";

const RESERVED_HANDLES = [...new Set([...reservedHandles])];
const schema = z.object({
	name: z
		.string()
		.min(3, "Too Short. Must be at least 3 characters")
		.max(25, "Too Long. Must be 25 characters or less"),
	handle: z
		.string()
		.min(3, "Too Short. Must be at least 3 characters")
		.max(25, "Too Long. Must be 25 characters or less")
		.regex(
			/^[a-zA-Z][a-zA-Z0-9-]*$/,
			"Must start with a alphabet and can only contain alphabets, numbers, and hyphens",
		)
		.refine((name) => {
			const isReserved = RESERVED_HANDLES.some(
				(reserved) => reserved.toLowerCase() === name.toLowerCase(),
			);
			return !isReserved;
		}, "This handle cannot be used")
		.refine(
			(name) => !/^\d+$/.test(name),
			"handle cannot consist of only numbers",
		),
	profile: z
		.string()
		.max(200, "Too Long. Must be 200 characters or less")
		.optional(),
});

export type UserEditState = ActionState & {
	fieldErrors?: {
		name?: string[];
		handle?: string[];
		profile?: string[];
	};
	redirect?: string;
};
export async function userEditAction(
	previousState: UserEditState,
	formData: FormData,
): Promise<UserEditState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const validation = schema.safeParse({
		name: formData.get("name"),
		handle: formData.get("handle"),
		profile: formData.get("profile"),
	});
	if (!validation.success) {
		return {
			fieldErrors: validation.error.flatten()
				.fieldErrors as UserEditState["fieldErrors"],
		};
	}

	const { name, handle, profile } = validation.data;

	await updateUser(currentUser.id, {
		name,
		handle,
		profile,
	});
	revalidatePath(`/user/${handle}/edit`);
	if (handle !== currentUser.handle) {
		redirect(`/user/${handle}/edit`);
	}
	return { success: true, message: "Profile updated successfully" };
}

export interface UserImageEditState extends ActionState {
	imageUrl?: string;
	fieldErrors?: {
		image: string;
	};
}

export async function userImageEditAction(
	previousState: UserImageEditState,
	formData: FormData,
): Promise<UserImageEditState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const file = formData.get("image") as File;
	if (!file) {
		return { error: "No image provided" };
	}
	if (file) {
		const MAX_SIZE = 5 * 1024 * 1024; // 5MB
		if (file.size > MAX_SIZE) {
			return {
				fieldErrors: {
					image: "Image size exceeds 5MB limit. Please choose a smaller file.",
				},
			};
		}
	}
	const imageUrl = await uploadImage(file);
	if (imageUrl.error) {
		return { error: imageUrl.error };
	}
	const result = await uploadImage(file);
	if (result.error || !result.imageUrl) {
		return {
			fieldErrors: {
				image: "Failed to upload image",
			},
		};
	}
	await updateUserImage(currentUser.id, result.imageUrl);
	revalidatePath(`/user/${currentUser.handle}/edit`);
	return {
		success: true,
		imageUrl: result.imageUrl,
		message: "Profile image updated successfully",
	};
}
