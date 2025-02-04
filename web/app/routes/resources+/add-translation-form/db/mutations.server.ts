import { data } from "@remix-run/node";
import { prisma } from "~/utils/prisma";
import { AddTranslationFormIntent } from "../route";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
	intent: AddTranslationFormIntent,
) {
	if (intent === AddTranslationFormIntent.PAGE_SEGMENT_TRANSLATION) {
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
	} else if (intent === AddTranslationFormIntent.COMMENT_SEGMENT_TRANSLATION) {
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

	return data({ success: true });
}
