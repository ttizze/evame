import { z } from "zod";
import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import type { ActionResponse } from "@/app/types";
import reservedHandles from "../_components/reserved-handles.json";
import { updateUser, updateUserImage } from "../_db/mutations.server";

const RESERVED_HANDLES = [...new Set([...reservedHandles])];

export const profileEditSchema = z.object({
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
	twitterHandle: z
		.string()
		.max(100, "Too Long. Must be 100 characters or less")
		.refine(
			(value) => value === "" || value.startsWith("@"),
			"Must start with @",
		)
		.transform((value) => (value === "" ? undefined : value))
		.optional(),
});

export type ProfileEditState = ActionResponse<
	{
		name: string;
		profile?: string;
		twitterHandle?: string;
	},
	{
		name: string;
		handle: string;
		profile: string;
		twitterHandle: string;
	}
>;

export async function updateProfileForUser(
	userId: string,
	formData: FormData,
): Promise<ProfileEditState> {
	const parsedData = await parseFormData(profileEditSchema, formData);
	if (!parsedData.success) {
		return {
			success: false,
			zodErrors: parsedData.error.flatten().fieldErrors,
		};
	}

	const { name, handle, profile, twitterHandle } = parsedData.data;
	await updateUser(userId, {
		name,
		handle,
		profile,
		twitterHandle,
	});

	return {
		success: true,
		message: "User updated successfully",
		data: {
			name,
			profile,
			twitterHandle,
		},
	};
}

export type ProfileImageEditState = ActionResponse<
	{
		imageUrl: string;
	},
	void
>;

function isImageFile(value: FormDataEntryValue | null): value is File {
	return (
		typeof value === "object" &&
		value !== null &&
		"arrayBuffer" in value &&
		typeof value.arrayBuffer === "function" &&
		"size" in value &&
		typeof value.size === "number" &&
		"type" in value &&
		typeof value.type === "string"
	);
}

export async function updateProfileImageForUser(
	userId: string,
	formData: FormData,
): Promise<ProfileImageEditState> {
	const file = formData.get("image");
	if (!isImageFile(file)) {
		return { success: false, message: "No image provided" };
	}

	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		return {
			success: false,
			message: "Image size exceeds 5MB limit. Please choose a smaller file.",
		};
	}

	const result = await uploadImage(file);
	if (!result.success || !result.data?.imageUrl) {
		return {
			success: false,
			message: "Failed to upload image",
		};
	}

	await updateUserImage(userId, result.data.imageUrl);
	return {
		success: true,
		data: { imageUrl: result.data.imageUrl },
		message: "Profile image updated successfully",
	};
}
