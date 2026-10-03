import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";
import type { TranslationContext } from "../../types";

const createContextSchema = z.object({
	contextName: z.string().min(1).max(50),
	context: z.string().min(1).max(500),
});

const updateContextSchema = createContextSchema.extend({
	id: z.coerce.number().min(1),
});

export type CreateContextActionState = ActionResponse<TranslationContext>;
export type UpdateContextActionState = ActionResponse<TranslationContext>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const createContext = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<CreateContextActionState> => {
		const parsed = createContextSchema.safeParse({
			contextName: formData.get("contextName"),
			context: formData.get("context"),
		});
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
				.insertInto("translationContexts")
				.values({
					userId: currentUser.id,
					name: parsed.data.contextName,
					context: parsed.data.context,
				})
				.returning(["id", "name", "context"])
				.executeTakeFirstOrThrow();
			return { success: true, data: result };
		} catch {
			return { success: false, message: "Failed to create context" };
		}
	});

export const updateContext = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<UpdateContextActionState> => {
		const parsed = updateContextSchema.safeParse({
			id: formData.get("id"),
			contextName: formData.get("contextName"),
			context: formData.get("context"),
		});
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
				.updateTable("translationContexts")
				.set({
					name: parsed.data.contextName,
					context: parsed.data.context,
					updatedAt: new Date(),
				})
				.where("id", "=", parsed.data.id)
				.where("userId", "=", currentUser.id)
				.returning(["id", "name", "context"])
				.executeTakeFirst();
			if (!result) {
				return { success: false, message: "Context not found" };
			}
			return { success: true, data: result };
		} catch {
			return { success: false, message: "Failed to update context" };
		}
	});
