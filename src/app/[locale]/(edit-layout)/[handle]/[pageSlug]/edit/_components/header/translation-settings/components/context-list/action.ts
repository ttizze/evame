import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";

const deleteContextSchema = z.object({
	id: z.coerce.number().min(1),
});

export type DeleteContextActionState = ActionResponse<boolean>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const deleteContext = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<DeleteContextActionState> => {
		const parsed = deleteContextSchema.safeParse({ id: formData.get("id") });
		if (!parsed.success) {
			return {
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			};
		}

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: "/auth/login" });
		}

		try {
			const result = await db
				.deleteFrom("translationContexts")
				.where("id", "=", parsed.data.id)
				.where("userId", "=", currentUser.id)
				.executeTakeFirst();
			if (result.numDeletedRows === BigInt(0)) {
				return { success: false, message: "Context not found" };
			}
			return { success: true, data: true };
		} catch {
			return { success: false, message: "Failed to delete context" };
		}
	});
