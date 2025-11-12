"use server";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { revalidatePageForLocale } from "@/lib/revalidate-utils";
import { addUserTranslation } from "./db/mutations.server";

const schema = z.object({
	locale: z.string(),
	segmentId: z.coerce.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

export async function addTranslationFormAction(
	_previousState: ActionResponse,
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
	const { segmentId, text, locale } = data;

	// Infer page slug and id by resolving segment -> content -> page or pageComment
	const resolved = await prisma.segment.findUnique({
		where: { id: segmentId },
		select: {
			content: {
				select: {
					page: { select: { id: true, slug: true } },
					pageComment: {
						select: { page: { select: { id: true, slug: true } } },
					},
				},
			},
		},
	});
	const page =
		resolved?.content.page ?? resolved?.content.pageComment?.page ?? null;
	if (!page) {
		return {
			success: false,
			message: "page not found",
		};
	}

	await addUserTranslation(segmentId, text, currentUser.id, locale);

	// Revalidate page for ISR to include the new translation
	await revalidatePageForLocale(page.id, locale);

	return {
		success: true,
		data: undefined,
	};
}
