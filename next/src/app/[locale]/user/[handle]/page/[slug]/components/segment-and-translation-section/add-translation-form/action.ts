"use server";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addUserTranslation } from "./db/mutations.server";
const schema = z.object({
	locale: z.string(),
	segmentId: z.coerce.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
	addTranslationFormTarget: z.enum([
		ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION,
		ADD_TRANSLATION_FORM_TARGET.COMMENT_SEGMENT_TRANSLATION,
	]),
});

export async function addTranslationFormAction(
	previousState: ActionState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		throw new Error("Unauthorized");
	}
	const parsedFormData = await parseAddTranslationForm(formData);

	await addUserTranslation(
		parsedFormData.segmentId,
		parsedFormData.text,
		currentUser.id,
		parsedFormData.locale,
		parsedFormData.addTranslationFormTarget,
	);
	revalidatePath(`/user/${currentUser.handle}/page/`);
	return {
		success: "Translation added successfully",
	};
}

export async function parseAddTranslationForm(formData: FormData) {
	const result = schema.safeParse({
		segmentId: formData.get("segmentId"),
		text: formData.get("text"),
		locale: formData.get("locale"),
		addTranslationFormTarget: formData.get("addTranslationFormTarget"),
	});
	if (!result.success) {
		throw new Error(result.error.message);
	}
	return result.data;
}
