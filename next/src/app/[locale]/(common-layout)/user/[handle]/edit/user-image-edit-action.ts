
"use server";
import { uploadImage } from "@/app/[locale]/lib/upload";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateUserImage } from "./db/mutations.server";
import type { ActionResponse } from "@/app/types";

export type UserImageEditState = ActionResponse<{
	imageUrl?: string;
}, {
	image: File;
}>;

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
		return { success: false, message: "No image provided" };
	}
	if (file) {
		const MAX_SIZE = 5 * 1024 * 1024; // 5MB
		if (file.size > MAX_SIZE) {
			return {
				success: false,
				message: "Image size exceeds 5MB limit. Please choose a smaller file.",
			};
		}
	}
	const result = await uploadImage(file);
	if (!result.success || !result.data?.imageUrl) {
		return {
			success: false,
			message: "Failed to upload image",
		};
	}
	await updateUserImage(currentUser.id, result.data?.imageUrl);
	revalidatePath(`/user/${currentUser.handle}/edit`);
	return {
		success: true,
		data: {
			imageUrl: result.data?.imageUrl,
		},
		message: "Profile image updated successfully",
	};
}
