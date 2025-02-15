"use server";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addUserTranslation } from "./db/mutations.server";
import { getCommentSegmentById, getPageSegmentById } from "./db/queries.server";
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
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
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
	const { segmentId, text, locale, addTranslationFormTarget } =
		parsedFormData.data;

	let pageSlug = "";
	if (
		addTranslationFormTarget ===
		ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
	) {
		const pageSegment = await getPageSegmentById(segmentId);
		if (!pageSegment) {
			return {
				success: false,
				message: "Page segment not found",
			};
		}
		pageSlug = pageSegment.page.slug;
	}
	if (
		addTranslationFormTarget ===
		ADD_TRANSLATION_FORM_TARGET.COMMENT_SEGMENT_TRANSLATION
	) {
		const commentSegment = await getCommentSegmentById(segmentId);
		if (!commentSegment) {
			return {
				success: false,
				message: "Comment segment not found",
			};
		}
		pageSlug = commentSegment.pageComment.page.slug;
	}
	if (!pageSlug) {
		return {
			success: false,
			message: "pageSlug is not defined",
		};
	}
	await addUserTranslation(
		segmentId,
		text,
		currentUser.id,
		locale,
		addTranslationFormTarget,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${pageSlug}`);
	return {
		success: true,
	};
}
