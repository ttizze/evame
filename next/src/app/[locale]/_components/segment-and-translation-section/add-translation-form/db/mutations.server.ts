import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { prisma } from "@/lib/prisma";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
	targetContentType: TargetContentType,
) {
	if (targetContentType === "page") {
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
	} else if (targetContentType === "pageComment") {
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
