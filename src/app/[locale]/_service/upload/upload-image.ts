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

		const processed: File =
			file.type === "image/svg+xml"
				? file // ベクタは変換不要
				: await (async () => {
						const sourceBuffer = await file.arrayBuffer();

						try {
							const sharpModule = await import("sharp");
							const sharp = sharpModule.default;
							const optimizedBuffer = await sharp(Buffer.from(sourceBuffer))
								.resize({ width: 2560, withoutEnlargement: true })
								.jpeg({ quality: 80, mozjpeg: true })
								.toBuffer();
							// Convert Node.js Buffer -> ArrayBuffer to satisfy DOM File typing
							const optimizedArrayBuffer = (() => {
								const arrayBuffer = new ArrayBuffer(optimizedBuffer.byteLength);
								new Uint8Array(arrayBuffer).set(optimizedBuffer);
								return arrayBuffer;
							})();

							return new File(
								[optimizedArrayBuffer],
								file.name.replace(/\.[^.]+$/, ".jpg"),
								{
									type: "image/jpeg",
								},
							);
						} catch {
							// Cloudflare Workers では sharp が利用できないため元画像で継続する
							return new File([sourceBuffer], file.name, { type: file.type });
						}
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
