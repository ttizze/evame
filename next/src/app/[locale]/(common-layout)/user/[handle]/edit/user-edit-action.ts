"use server";
import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import reservedHandles from "./reserved-handles.json";
import { updateUser } from "./db/mutations.server";
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
});

export type UserEditState = ActionResponse<void, {
	name: string;
	handle: string;
	profile: string;
}>;
export async function userEditAction(
	previousState: UserEditState,
	formData: FormData,
): Promise<UserEditState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const parsed = schema.safeParse({
		name: formData.get("name"),
		handle: formData.get("handle"),
		profile: formData.get("profile"),
	});
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { name, handle, profile } = parsed.data;

	if (handle !== currentUser.handle) {
		redirect(`/user/${handle}/edit`);
	}
	await updateUser(currentUser.id, {
		name,
		handle,
		profile,
	});
	revalidatePath(`/user/${handle}/edit`);
	return { success: true, message: "Profile updated successfully" };
}
