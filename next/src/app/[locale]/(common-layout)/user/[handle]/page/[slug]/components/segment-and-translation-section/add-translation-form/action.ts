"use server";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addUserTranslation } from "./db/mutations.server";
import { redirect } from "next/navigation";
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
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const parsedFormData = schema.safeParse({
		segmentId: formData.get("segmentId"),
		text: formData.get("text"),
		locale: formData.get("locale"),
		addTranslationFormTarget: formData.get("addTranslationFormTarget"),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}

	await addUserTranslation(
		parsedFormData.data.segmentId,
		parsedFormData.data.text,
		currentUser.id,
		parsedFormData.data.locale,
		parsedFormData.data.addTranslationFormTarget,
	);
	revalidatePath(`/user/${currentUser.handle}/page/`);
	return {
		success: true,
	};
}
