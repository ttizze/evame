"use server";

import type { ActionState } from "@/app/types";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const isProduction = process.env.NODE_ENV === "production";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = isProduction ? "eveeve" : "evame";

const s3Client = new S3Client(
	isProduction
		? {
				region: "us-east-1",
				endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				credentials: {
					accessKeyId: R2_ACCESS_KEY_ID ?? "",
					secretAccessKey: R2_SECRET_ACCESS_KEY ?? "",
				},
			}
		: {
				region: "us-east-1",
				endpoint: "http://localhost:9000",
				credentials: {
					accessKeyId: "minioadmin",
					secretAccessKey: "minioadmin",
				},
				forcePathStyle: true,
			},
);

export interface imgActionState extends ActionState {
	imageUrl?: string;
}

async function uploadToR2(file: File): Promise<string> {
	const key = `uploads/${Date.now()}-${file.name}`;
	const arrayBuffer = await file.arrayBuffer();

	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: key,
		Body: Buffer.from(arrayBuffer),
		ContentType: file.type,
	});

	await s3Client.send(command);
	return isProduction
		? `https://images.eveeve.org/${key}`
		: `http://localhost:9000/${R2_BUCKET_NAME}/${key}`;
}
export interface UploadImageResult {
	error?: string;
	imageUrl?: string;
}

export async function uploadImage(file: File): Promise<UploadImageResult> {
	try {
		if (!file.type.startsWith("image/")) {
			return { error: "Please select a valid image file" };
		}

		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			return { error: "Image file size must be less than 5MB" };
		}

		const imageUrl = await uploadToR2(file);

		return {
			imageUrl,
		};
	} catch (error) {
		console.error("Upload error:", error);
		return { error: "Failed to upload image" };
	}
}
