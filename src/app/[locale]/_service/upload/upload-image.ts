"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
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

// Cloudflare Images binding の最小限の構造的型
// (`wrangler types` の生成物に依存せず typecheck を通すため)
type ImagesTransformer = {
	transform(options: {
		width?: number;
		fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
	}): ImagesTransformer;
	output(options: { format: string; quality?: number }): Promise<{
		response(): Response;
		contentType(): string;
	}>;
};
type ImagesBinding = {
	input(stream: ReadableStream): ImagesTransformer;
};

function getImagesBinding(): ImagesBinding | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as { IMAGES?: ImagesBinding }).IMAGES;
	} catch {
		// Cloudflare 外 (プレーンな next dev / next start など)
		return undefined;
	}
}

/** Cloudflare Images binding で幅 2560px 以下の JPEG に変換する (sharp の置き換え) */
async function optimizeImage(file: File): Promise<File> {
	// ベクタは変換不要
	if (file.type === "image/svg+xml") {
		return file;
	}

	const images = getImagesBinding();
	if (!images) {
		// binding が使えない環境では元画像をそのままアップロードする
		return file;
	}

	try {
		const result = await images
			.input(file.stream())
			.transform({ width: 2560, fit: "scale-down" })
			.output({ format: "image/jpeg", quality: 80 });
		const buf = await result.response().arrayBuffer();
		return new File([buf], file.name.replace(/\.[^.]+$/, ".jpg"), {
			type: "image/jpeg",
		});
	} catch (error) {
		// 変換に失敗した場合は元画像にフォールバック (サイズ上限チェックは呼び出し側で行う)
		console.error("Image optimization failed, uploading original:", error);
		return file;
	}
}

export async function uploadImage(file: File): Promise<UploadImageResult> {
	try {
		if (!file.type.startsWith("image/")) {
			return { success: false, message: "Please select a valid image file" };
		}
		const maxSize = 5 * 1024 * 1024;

		const processed = await optimizeImage(file);

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
