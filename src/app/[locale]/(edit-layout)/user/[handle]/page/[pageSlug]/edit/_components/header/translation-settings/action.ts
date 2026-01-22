"use server";

import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";
import type { TranslationContext } from "./types";

const createContextSchema = z.object({
	name: z.string().min(1).max(50),
	context: z.string().min(1).max(500),
});

const updateContextSchema = z.object({
	id: z.coerce.number().min(1),
	name: z.string().min(1).max(50),
	context: z.string().min(1).max(500),
});

const deleteContextSchema = z.object({
	id: z.coerce.number().min(1),
});

export type CreateContextActionState = ActionResponse<TranslationContext>;
export type UpdateContextActionState = ActionResponse<TranslationContext>;
export type DeleteContextActionState = ActionResponse<boolean>;

export async function createContextAction(
	_previousState: CreateContextActionState,
	formData: FormData,
): Promise<CreateContextActionState> {
	const v = await authAndValidate(createContextSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;

	try {
		const result = await db
			.insertInto("translationContexts")
			.values({
				userId: currentUser.id,
				name: data.name,
				context: data.context,
			})
			.returning(["id", "name", "context"])
			.executeTakeFirstOrThrow();

		return { success: true, data: result };
	} catch {
		return { success: false, message: "Failed to create context" };
	}
}

export async function updateContextAction(
	_previousState: UpdateContextActionState,
	formData: FormData,
): Promise<UpdateContextActionState> {
	const v = await authAndValidate(updateContextSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;

	try {
		const result = await db
			.updateTable("translationContexts")
			.set({ name: data.name, context: data.context, updatedAt: new Date() })
			.where("id", "=", data.id)
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
}

export async function deleteContextAction(
	_previousState: DeleteContextActionState,
	formData: FormData,
): Promise<DeleteContextActionState> {
	const v = await authAndValidate(deleteContextSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;

	try {
		const result = await db
			.deleteFrom("translationContexts")
			.where("id", "=", data.id)
			.where("userId", "=", currentUser.id)
			.executeTakeFirst();

		if (result.numDeletedRows === BigInt(0)) {
			return { success: false, message: "Context not found" };
		}
		return { success: true, data: true };
	} catch {
		return { success: false, message: "Failed to delete context" };
	}
}
