import {
	ADD_TRANSLATION_FORM_TARGET,
	type AddTranslationFormTarget,
} from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { prisma } from "@/lib/prisma";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
	addTranslationFormTarget: AddTranslationFormTarget,
) {
	if (
		addTranslationFormTarget ===
		ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
	) {
		const pageSegment = await prisma.pageSegment.findUnique({
			where: { id: segmentId },
		});

		if (pageSegment) {
			await prisma.pageSegmentTranslation.create({
				data: {
					locale,
					text,
					pageSegmentId: segmentId,
					userId,
				},
			});
		}
	} else if (
		addTranslationFormTarget ===
		ADD_TRANSLATION_FORM_TARGET.COMMENT_SEGMENT_TRANSLATION
	) {
		const pageCommentSegment = await prisma.pageCommentSegment.findUnique({
			where: { id: segmentId },
		});

		if (pageCommentSegment) {
			await prisma.pageCommentSegmentTranslation.create({
				data: {
					locale,
					text,
					pageCommentSegmentId: segmentId,
					userId,
				},
			});
		}
	}

	return { success: true };
}
