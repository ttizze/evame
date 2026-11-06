import { redirect } from "@tanstack/react-router";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import type { ActionResponse } from "@/app/types";

export type EditorImageUploadResult = ActionResponse<{ imageUrl: string }>;

export async function uploadEditorImage(
	formData: FormData,
	requestHeaders: Headers,
): Promise<EditorImageUploadResult> {
	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
	if (!currentUser?.id) {
		throw redirect({ href: "/auth/login" });
	}

	const file = formData.get("image");
	if (!(file instanceof File)) {
		return { success: false, message: "Please select a valid image file" };
	}
	return uploadImage(file);
}
