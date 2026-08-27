"use server";

import sharp from "sharp";
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

		const processed: File =
			file.type === "image/svg+xml"
				? file // ベクタは変換不要
				: await (async () => {
						const buf = await sharp(Buffer.from(await file.arrayBuffer()))
							.resize({ width: 2560, withoutEnlargement: true })
							.jpeg({ quality: 80, mozjpeg: true })
							.toBuffer();
						// Convert Node.js Buffer -> ArrayBuffer to satisfy DOM File typing
						const ab = (() => {
							const arrayBuffer = new ArrayBuffer(buf.byteLength);
							new Uint8Array(arrayBuffer).set(buf);
							return arrayBuffer;
						})();
						return new File([ab], file.name.replace(/\.[^.]+$/, ".jpg"), {
							type: "image/jpeg",
						});
					})();

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
