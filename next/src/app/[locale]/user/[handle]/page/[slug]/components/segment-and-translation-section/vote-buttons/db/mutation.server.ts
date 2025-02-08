import { prisma } from "@/lib/prisma";
import { VOTE_TARGET } from "../constants";
import type { VoteTarget } from "../constants";

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	userId: string,
	voteTarget: VoteTarget,
) {
	if (voteTarget === VOTE_TARGET.PAGE_SEGMENT_TRANSLATION) {
		await prisma.$transaction(async (tx) => {
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
					await tx.vote.delete({ where: { id: existingVote.id } });
					await tx.pageSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? -1 : 1 } },
					});
				} else {
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
		});
	}

	return { success: true };
}
