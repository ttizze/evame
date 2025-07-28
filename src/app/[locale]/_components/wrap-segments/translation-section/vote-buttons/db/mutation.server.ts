import type { Prisma } from "@prisma/client";
import { calcProofStatus } from "@/app/[locale]/_components/wrap-segments/translation-section/vote-buttons/_lib/translation-proof-status";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { prisma } from "@/lib/prisma";

type VoteOutcome = {
	finalIsUpvote: boolean | undefined;
	/** How much the point field should be incremented (can be negative) */
	pointDelta: number;
	action: "create" | "update" | "delete";
};

function computeVoteOutcome(
	previousIsUpvote: boolean | undefined,
	newIsUpvote: boolean,
): VoteOutcome {
	if (previousIsUpvote === newIsUpvote) {
		// The same vote exists → remove it.
		return {
			finalIsUpvote: undefined,
			pointDelta: newIsUpvote ? -1 : 1,
			action: "delete",
		} as const;
	}

	if (previousIsUpvote === undefined) {
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
				point: true,
			},
		});
		if (!segmentTranslation) {
			return {
				success: false,
				data: { isUpvote: undefined, point: 0 },
			};
		}

		const { pageId } = segmentTranslation.pageSegment;
		const { locale } = segmentTranslation;

		await updateProofStatus(tx, pageId, locale);

		return {
			success: true,
			data: { isUpvote: finalIsUpvote, point: segmentTranslation.point },
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

	const outcome = computeVoteOutcome(
		existingVote?.isUpvote ?? undefined,
		isUpvote,
	);

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
			existingVote?.isUpvote ?? undefined,
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
