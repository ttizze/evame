import { prisma } from "@/lib/prisma";
import { VOTE_TARGET } from "../constants";
import type { VoteTarget } from "../constants";

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	userId: string,
	voteTarget: VoteTarget,
) {
	let updatedPoint = 0;
	if (voteTarget === VOTE_TARGET.PAGE_SEGMENT_TRANSLATION) {
		updatedPoint = await prisma.$transaction(async (tx) => {
			const existingVote = await tx.vote.findUnique({
				where: {
					pageSegmentTranslationId_userId: {
						pageSegmentTranslationId: segmentTranslationId,
						userId,
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
						userId,
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
	} else if (voteTarget === VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION) {
		await prisma.$transaction(async (tx) => {
			const existingVote =
				await tx.pageCommentSegmentTranslationVote.findUnique({
					where: {
						pageCommentSegmentTranslationId_userId: {
							pageCommentSegmentTranslationId: segmentTranslationId,
							userId,
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
						userId,
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

	return { success: true, data: { isUpvote, point: updatedPoint } };
}
