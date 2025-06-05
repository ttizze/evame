"use server";
import { targetContentTypeValues } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { revalidatePath } from "next/cache";
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
	targetContentType: z.enum(targetContentTypeValues),
});

export async function addTranslationFormAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { segmentId, text, locale, targetContentType } = data;

	let pageSlug = "";
	if (targetContentType === "page") {
		const pageSegment = await getPageSegmentById(segmentId);
		if (!pageSegment) {
			return {
				success: false,
				message: "Page segment not found",
			};
		}
		pageSlug = pageSegment.page.slug;
	}
	if (targetContentType === "pageComment") {
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
		targetContentType,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${pageSlug}`);
	return {
		success: true,
		data: undefined,
	};
}
