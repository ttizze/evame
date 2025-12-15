"use server";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/lib/auth-server";
import { parseFormData } from "@/lib/parse-form-data";
import { updateUser } from "../_db/mutations.server";
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
	twitterHandle: z
		.string()
		.max(100, "Too Long. Must be 100 characters or less")
		.refine((val) => val === "" || val.startsWith("@"), "Must start with @")
		.transform((val) => (val === "" ? undefined : val))
		.optional(),
});

export type UserEditState = ActionResponse<
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
export async function userEditAction(
	_previousState: UserEditState,
	formData: FormData,
): Promise<UserEditState> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		redirect("/auth/login" as Route);
	}
	const parsedData = await parseFormData(schema, formData);
	if (!parsedData.success) {
		return {
			success: false,
			zodErrors: parsedData.error.flatten().fieldErrors,
		};
	}

	const { name, handle, profile, twitterHandle } = parsedData.data;

	await updateUser(currentUser.id, {
		name,
		handle,
		profile,
		twitterHandle,
	});
	if (handle !== currentUser.handle) {
		redirect(`/user/${handle}/edit` as Route);
	}
	revalidatePath("/settings/profile");
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
