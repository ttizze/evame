"use server";

import { uploadToR2 } from "@/app/[locale]/_infrastructure/upload/r2-client";
import type { ActionResponse } from "@/app/types";

type UploadImageResult = ActionResponse<
	{
		imageUrl: string;
	},
	{
		image: File;
	}
>;

export async function uploadImage(file: File): Promise<UploadImageResult> {
	try {
		if (!file.type.startsWith("image/")) {
			return { success: false, message: "Please select a valid image file" };
		}
		const maxSize = 5 * 1024 * 1024;
		const processed = file;

		if (processed.size > maxSize) {
			return {
				success: false,
				message: "Image must be < 5 MB after processing",
			};
		}
		const imageUrl = await uploadToR2(processed);

		return {
			success: true,
			data: {
				imageUrl,
			},
		};
	} catch (error) {
		console.error("Upload error:", error);
		return { success: false, message: "Failed to upload image" };
	}
}
