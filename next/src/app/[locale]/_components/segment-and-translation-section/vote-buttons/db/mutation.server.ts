import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { prisma } from "@/lib/prisma";

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
	targetContentType: TargetContentType,
) {
	let updatedPoint = 0;
	let finalIsUpvote: boolean | null = isUpvote;
	if (targetContentType === "page") {
		updatedPoint = await prisma.$transaction(async (tx) => {
			const existingVote = await tx.vote.findUnique({
				where: {
					pageSegmentTranslationId_userId: {
						pageSegmentTranslationId: segmentTranslationId,
						userId: currentUserId,
					},
				},
			});

			if (existingVote) {
				if (existingVote.isUpvote === isUpvote) {
					// 同じ投票なら削除して point を調整
					await tx.vote.delete({ where: { id: existingVote.id } });
					await tx.pageSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? -1 : 1 } },
					});
					finalIsUpvote = null;
				} else {
					// 投票内容が異なる場合は更新して point を調整
					await tx.vote.update({
						where: { id: existingVote.id },
						data: { isUpvote },
					});
					await tx.pageSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? 2 : -2 } },
					});
				}
			} else {
				// 新規投票なら作成して point を調整
				await tx.vote.create({
					data: {
						userId: currentUserId,
						pageSegmentTranslationId: segmentTranslationId,
						isUpvote,
					},
				});
				await tx.pageSegmentTranslation.update({
					where: { id: segmentTranslationId },
					data: { point: { increment: isUpvote ? 1 : -1 } },
				});
			}
			const updatedTranslation = await tx.pageSegmentTranslation.findUnique({
				where: { id: segmentTranslationId },
				select: { point: true },
			});
			return updatedTranslation?.point ?? 0;
		});
	} else if (targetContentType === "comment") {
		updatedPoint = await prisma.$transaction(async (tx) => {
			const existingVote =
				await tx.pageCommentSegmentTranslationVote.findUnique({
					where: {
						pageCommentSegmentTranslationId_userId: {
							pageCommentSegmentTranslationId: segmentTranslationId,
							userId: currentUserId,
						},
					},
				});

			if (existingVote) {
				if (existingVote.isUpvote === isUpvote) {
					await tx.pageCommentSegmentTranslationVote.delete({
						where: { id: existingVote.id },
					});
					await tx.pageCommentSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? -1 : 1 } },
					});
					finalIsUpvote = null;
				} else {
					await tx.pageCommentSegmentTranslationVote.update({
						where: { id: existingVote.id },
						data: { isUpvote },
					});
					await tx.pageCommentSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? 2 : -2 } },
					});
				}
			} else {
				await tx.pageCommentSegmentTranslationVote.create({
					data: {
						userId: currentUserId,
						pageCommentSegmentTranslationId: segmentTranslationId,
						isUpvote,
					},
				});
				await tx.pageCommentSegmentTranslation.update({
					where: { id: segmentTranslationId },
					data: { point: { increment: isUpvote ? 1 : -1 } },
				});
			}
			const updatedTranslation =
				await tx.pageCommentSegmentTranslation.findUnique({
					where: { id: segmentTranslationId },
					select: { point: true },
				});
			return updatedTranslation?.point ?? 0;
		});
	}

	return {
		success: true,
		data: { isUpvote: finalIsUpvote, point: updatedPoint },
	};
}

export async function createNotificationPageSegmentTranslationVote(
	pageSegmentTranslationId: number,
	actorId: string,
) {
	const pageSegmentTranslation = await prisma.pageSegmentTranslation.findUnique(
		{
			where: { id: pageSegmentTranslationId },
			select: {
				user: { select: { id: true } },
			},
		},
	);
	if (!pageSegmentTranslation) {
		return;
	}
	await prisma.notification.create({
		data: {
			pageSegmentTranslationId: pageSegmentTranslationId,
			userId: pageSegmentTranslation.user.id,
			actorId: actorId,
			type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		},
	});
}
