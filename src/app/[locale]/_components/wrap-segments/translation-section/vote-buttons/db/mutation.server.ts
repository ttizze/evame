import type { Prisma } from "@prisma/client";
import { TranslationProofStatus } from "@prisma/client";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type VoteOutcome = {
	finalIsUpvote: boolean | null;
	/** How much the point field should be incremented (can be negative) */
	pointDelta: number;
	action: "create" | "update" | "delete";
};

/**
 * Compute how the vote should be applied based on the previous vote state.
 * Returns the final vote state (null = no vote), how much to change the point
 * count by, and what persistence action should be executed.
 */
function computeVoteOutcome(
	previousIsUpvote: boolean | null,
	newIsUpvote: boolean,
): VoteOutcome {
	if (previousIsUpvote === newIsUpvote) {
		// The same vote exists → remove it.
		return {
			finalIsUpvote: null,
			pointDelta: newIsUpvote ? -1 : 1,
			action: "delete",
		} as const;
	}

	if (previousIsUpvote === null) {
		// No existing vote → create a new one.
		return {
			finalIsUpvote: newIsUpvote,
			pointDelta: newIsUpvote ? 1 : -1,
			action: "create",
		} as const;
	}

	// Previous vote exists but with the opposite polarity → update.
	return {
		finalIsUpvote: newIsUpvote,
		pointDelta: newIsUpvote ? 2 : -2,
		action: "update",
	} as const;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
	targetContentType: TargetContentType,
) {
	if (targetContentType === "page") {
		return processPageVote(segmentTranslationId, isUpvote, currentUserId);
	} else {
		return processCommentVote(segmentTranslationId, isUpvote, currentUserId);
	}
}

/* -------------------------------------------------------------------------- */
/* Page Vote                                                                   */
/* -------------------------------------------------------------------------- */

async function processPageVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return prisma.$transaction(async (tx) => {
		const { finalIsUpvote } = await applyVoteOnPageSegment(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		const segmentTranslation = await tx.pageSegmentTranslation.findUnique({
			where: { id: segmentTranslationId },
			select: {
				locale: true,
				pageSegment: { select: { pageId: true } },
			},
		});
		if (!segmentTranslation) return;

		const { pageId } = segmentTranslation.pageSegment;
		const { locale } = segmentTranslation;

		await updateProofStatus(tx, pageId, locale);

		return {
			success: true,
			data: { isUpvote: finalIsUpvote },
		};
	});
}

async function updateProofStatus(
	tx: Prisma.TransactionClient,
	pageId: number,
	locale: string,
) {
	const totalSegments = await tx.pageSegment.count({ where: { pageId } });
	if (totalSegments === 0) return;
	const segmentsWith1PlusVotes = await tx.pageSegmentTranslation.count({
		where: {
			locale,
			pageSegment: { pageId },
			point: { gte: 1 },
		},
	});

	const segmentsWith2PlusVotes = await tx.pageSegmentTranslation.count({
		where: {
			locale,
			pageSegment: { pageId },
			point: { gte: 2 },
		},
	});

	const newStatus = await calcProofStatus(
		totalSegments,
		segmentsWith1PlusVotes,
		segmentsWith2PlusVotes,
	);

	await tx.pageLocaleTranslationProof.upsert({
		where: { pageId_locale: { pageId, locale } },
		create: { pageId, locale, translationProofStatus: newStatus },
		update: { translationProofStatus: newStatus },
	});
}
async function calcProofStatus(
	totalSegments: number,
	segmentsWith1PlusVotes: number,
	segmentsWith2PlusVotes: number,
): Promise<TranslationProofStatus> {
	if (segmentsWith1PlusVotes === 0) return TranslationProofStatus.MACHINE_DRAFT;
	if (segmentsWith1PlusVotes < totalSegments)
		return TranslationProofStatus.HUMAN_TOUCHED;
	if (segmentsWith2PlusVotes === totalSegments)
		return TranslationProofStatus.VALIDATED;
	// すべてのセグメントが1票以上あるが、すべてが2票以上あるわけではない場合
	return TranslationProofStatus.PROOFREAD;
}

/* 投票と point 更新を行い、最終的な isUpvote を返す */
async function applyVoteOnPageSegment(
	tx: Prisma.TransactionClient,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	const existingVote = await tx.vote.findUnique({
		where: {
			pageSegmentTranslationId_userId: {
				pageSegmentTranslationId: segmentTranslationId,
				userId: currentUserId,
			},
		},
	});

	const outcome = computeVoteOutcome(existingVote?.isUpvote ?? null, isUpvote);

	switch (outcome.action) {
		case "delete":
			await tx.vote.delete({ where: { id: existingVote?.id } });
			break;
		case "update":
			await tx.vote.update({
				where: { id: existingVote?.id },
				data: { isUpvote },
			});
			break;
		case "create":
			await tx.vote.create({
				data: {
					userId: currentUserId,
					pageSegmentTranslationId: segmentTranslationId,
					isUpvote,
				},
			});
	}

	await tx.pageSegmentTranslation.update({
		where: { id: segmentTranslationId },
		data: { point: { increment: outcome.pointDelta } },
	});

	return { finalIsUpvote: outcome.finalIsUpvote };
}

/* -------------------------------------------------------------------------- */
/* Comment Vote                                                                */
/* -------------------------------------------------------------------------- */

async function processCommentVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return prisma.$transaction(async (tx) => {
		const existingVote = await tx.pageCommentSegmentTranslationVote.findUnique({
			where: {
				pageCommentSegmentTranslationId_userId: {
					pageCommentSegmentTranslationId: segmentTranslationId,
					userId: currentUserId,
				},
			},
		});

		const outcome = computeVoteOutcome(
			existingVote?.isUpvote ?? null,
			isUpvote,
		);

		switch (outcome.action) {
			case "delete":
				await tx.pageCommentSegmentTranslationVote.delete({
					where: { id: existingVote?.id },
				});
				break;
			case "update":
				await tx.pageCommentSegmentTranslationVote.update({
					where: { id: existingVote?.id },
					data: { isUpvote },
				});
				break;
			case "create":
				await tx.pageCommentSegmentTranslationVote.create({
					data: {
						userId: currentUserId,
						pageCommentSegmentTranslationId: segmentTranslationId,
						isUpvote,
					},
				});
		}

		const updatedTranslation = await tx.pageCommentSegmentTranslation.update({
			where: { id: segmentTranslationId },
			data: { point: { increment: outcome.pointDelta } },
			select: { point: true },
		});

		return {
			success: true,
			data: {
				isUpvote: outcome.finalIsUpvote,
				point: updatedTranslation.point,
			},
		};
	});
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
