
"use server";
import { uploadImage } from "@/app/[locale]/lib/upload";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateUserImage } from "./db/mutations.server";
import type { ActionState } from "@/app/types";

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
		redirect("/auth/login");
	}
	const file = formData.get("image") as File;
	if (!file) {
		return { success: false, error: "No image provided" };
	}
	if (file) {
		const MAX_SIZE = 5 * 1024 * 1024; // 5MB
		if (file.size > MAX_SIZE) {
			return {
				success: false,
				fieldErrors: {
					image: "Image size exceeds 5MB limit. Please choose a smaller file.",
				},
			};
		}
	}
	const imageUrl = await uploadImage(file);
	if (imageUrl.error) {
		return { success: false, error: imageUrl.error };
	}
	const result = await uploadImage(file);
	if (result.error || !result.imageUrl) {
		return {
			success: false,
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
