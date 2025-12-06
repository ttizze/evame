import type { Prisma } from "@prisma/client";
import { calcProofStatus } from "@/app/[locale]/(common-layout)/_components/wrap-segments/translation-section/vote-buttons/_lib/translation-proof-status";
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
) {
	const kind = await prisma.segmentTranslation.findUnique({
		where: { id: segmentTranslationId },
		select: { segment: { select: { content: { select: { kind: true } } } } },
	});
	const contentKind = kind?.segment.content.kind;
	if (contentKind === "PAGE") {
		return processPageVote(segmentTranslationId, isUpvote, currentUserId);
	}
	return processCommentVote(segmentTranslationId, isUpvote, currentUserId);
}

async function processPageVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return prisma.$transaction(async (tx) => {
		const { finalIsUpvote } = await applyVoteUnified(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		const segmentTranslation = await tx.segmentTranslation.findUnique({
			where: { id: segmentTranslationId },
			select: {
				locale: true,
				segment: {
					select: { content: { select: { page: { select: { id: true } } } } },
				},
				point: true,
			},
		});
		if (!segmentTranslation) {
			return {
				success: false,
				data: { isUpvote: undefined, point: 0 },
			};
		}

		const pageId = segmentTranslation.segment.content.page?.id;
		const { locale } = segmentTranslation;

		if (pageId) {
			await updateProofStatus(tx, pageId, locale);
		}

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
	const totalSegments = await tx.segment.count({
		where: { content: { page: { id: pageId } } },
	});
	if (totalSegments === 0) return;

	const segmentsWith1PlusVotes = await tx.segmentTranslation.count({
		where: {
			locale,
			segment: { content: { page: { id: pageId } } },
			point: { gte: 1 },
		},
	});

	const segmentsWith2PlusVotes = await tx.segmentTranslation.count({
		where: {
			locale,
			segment: { content: { page: { id: pageId } } },
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

/* 投票と point 更新（統一テーブル）を行い、最終的な isUpvote を返す */
async function applyVoteUnified(
	tx: Prisma.TransactionClient,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	const existingVote = await tx.translationVote.findUnique({
		where: {
			translationId_userId: {
				translationId: segmentTranslationId,
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
			await tx.translationVote.delete({
				where: {
					translationId_userId: {
						translationId: segmentTranslationId,
						userId: currentUserId,
					},
				},
			});
			break;
		case "update":
			await tx.translationVote.update({
				where: {
					translationId_userId: {
						translationId: segmentTranslationId,
						userId: currentUserId,
					},
				},
				data: { isUpvote },
			});
			break;
		case "create":
			await tx.translationVote.create({
				data: {
					translationId: segmentTranslationId,
					userId: currentUserId,
					isUpvote,
				},
			});
	}

	await tx.segmentTranslation.update({
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
		const { finalIsUpvote } = await applyVoteUnified(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		const updatedTranslation = await tx.segmentTranslation.findUnique({
			where: { id: segmentTranslationId },
			select: { point: true },
		});

		return {
			success: true,
			data: {
				isUpvote: finalIsUpvote,
				point: updatedTranslation?.point ?? 0,
			},
		};
	});
}

export async function createNotificationPageSegmentTranslationVote(
	pageSegmentTranslationId: number,
	actorId: string,
) {
	const segmentTranslation = await prisma.segmentTranslation.findUnique({
		where: { id: pageSegmentTranslationId },
		select: { user: { select: { id: true } } },
	});
	if (!segmentTranslation) {
		return;
	}
	await prisma.notification.create({
		data: {
			segmentTranslationId: pageSegmentTranslationId,
			userId: segmentTranslation.user.id,
			actorId: actorId,
			type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		},
	});
}
