import { and, eq, sql } from "drizzle-orm";
import { calcProofStatus } from "@/app/[locale]/(common-layout)/_components/wrap-segments/translation-section/vote-buttons/_lib/translation-proof-status";
import { db } from "@/drizzle";
import {
	contents,
	notifications,
	pageLocaleTranslationProofs,
	pages,
	segments,
	segmentTranslations,
	translationVotes,
} from "@/drizzle/schema";
import type { TransactionClient } from "@/drizzle/types";

type VoteOutcome = {
	finalIsUpvote: boolean | undefined;
	pointDelta: number;
	action: "create" | "update" | "delete";
};

/**
 * 投票結果を計算する
 * - 同じ投票が存在 → 削除
 * - 投票なし → 新規作成
 * - 反対の投票が存在 → 更新
 */
function computeVoteOutcome(
	previousIsUpvote: boolean | undefined,
	newIsUpvote: boolean,
): VoteOutcome {
	if (previousIsUpvote === newIsUpvote) {
		return {
			finalIsUpvote: undefined,
			pointDelta: newIsUpvote ? -1 : 1,
			action: "delete",
		};
	}
	if (previousIsUpvote === undefined) {
		return {
			finalIsUpvote: newIsUpvote,
			pointDelta: newIsUpvote ? 1 : -1,
			action: "create",
		};
	}
	return {
		finalIsUpvote: newIsUpvote,
		pointDelta: newIsUpvote ? 2 : -2,
		action: "update",
	};
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction(async (tx) => {
		// 投票処理と関連情報を同時に取得
		const { finalIsUpvote } = await applyVote(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		// 更新後のpoint と ページ情報を取得
		const result = await tx
			.select({
				point: segmentTranslations.point,
				locale: segmentTranslations.locale,
				pageId: pages.id,
			})
			.from(segmentTranslations)
			.innerJoin(segments, eq(segmentTranslations.segmentId, segments.id))
			.innerJoin(contents, eq(segments.contentId, contents.id))
			.leftJoin(pages, eq(contents.id, pages.id))
			.where(eq(segmentTranslations.id, segmentTranslationId))
			.limit(1);

		const row = result[0];
		if (!row) {
			return { success: false, data: { isUpvote: undefined, point: 0 } };
		}

		// ページの場合のみproof statusを更新
		if (row.pageId) {
			await updateProofStatus(tx, row.pageId, row.locale);
		}

		return {
			success: true,
			data: { isUpvote: finalIsUpvote, point: row.point },
		};
	});
}

/**
 * 投票の適用とpoint更新を行う
 */
async function applyVote(
	tx: TransactionClient,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	const existingVote = await tx
		.select({ isUpvote: translationVotes.isUpvote })
		.from(translationVotes)
		.where(
			and(
				eq(translationVotes.translationId, segmentTranslationId),
				eq(translationVotes.userId, currentUserId),
			),
		)
		.limit(1);

	const outcome = computeVoteOutcome(
		existingVote[0]?.isUpvote ?? undefined,
		isUpvote,
	);
	const voteCondition = and(
		eq(translationVotes.translationId, segmentTranslationId),
		eq(translationVotes.userId, currentUserId),
	);

	// 投票テーブルの操作
	if (outcome.action === "delete") {
		await tx.delete(translationVotes).where(voteCondition);
	} else if (outcome.action === "update") {
		await tx.update(translationVotes).set({ isUpvote }).where(voteCondition);
	} else {
		await tx.insert(translationVotes).values({
			translationId: segmentTranslationId,
			userId: currentUserId,
			isUpvote,
		});
	}

	// point更新
	await tx
		.update(segmentTranslations)
		.set({ point: sql`${segmentTranslations.point} + ${outcome.pointDelta}` })
		.where(eq(segmentTranslations.id, segmentTranslationId));

	return { finalIsUpvote: outcome.finalIsUpvote };
}

/**
 * ページのproof statusを更新する
 * 1クエリで全カウントを取得（sql<number>で型安全）
 */
async function updateProofStatus(
	tx: TransactionClient,
	pageId: number,
	locale: string,
) {
	const stats = await tx
		.select({
			totalSegments: sql<number>`count(*)`,
			segmentsWith1PlusVotes: sql<number>`count(case when ${segmentTranslations.point} >= 1 then 1 end)`,
			segmentsWith2PlusVotes: sql<number>`count(case when ${segmentTranslations.point} >= 2 then 1 end)`,
		})
		.from(segments)
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pages, eq(contents.id, pages.id))
		.leftJoin(
			segmentTranslations,
			and(
				eq(segmentTranslations.segmentId, segments.id),
				eq(segmentTranslations.locale, locale),
			),
		)
		.where(eq(pages.id, pageId));

	const { totalSegments, segmentsWith1PlusVotes, segmentsWith2PlusVotes } =
		stats[0] ?? {
			totalSegments: 0,
			segmentsWith1PlusVotes: 0,
			segmentsWith2PlusVotes: 0,
		};

	if (totalSegments === 0) return;

	const newStatus = calcProofStatus(
		totalSegments,
		segmentsWith1PlusVotes,
		segmentsWith2PlusVotes,
	);

	await tx
		.insert(pageLocaleTranslationProofs)
		.values({ pageId, locale, translationProofStatus: newStatus })
		.onConflictDoUpdate({
			target: [
				pageLocaleTranslationProofs.pageId,
				pageLocaleTranslationProofs.locale,
			],
			set: { translationProofStatus: newStatus },
		});
}

export async function createNotificationPageSegmentTranslationVote(
	pageSegmentTranslationId: number,
	actorId: string,
) {
	const segmentTranslation = await db
		.select({ userId: segmentTranslations.userId })
		.from(segmentTranslations)
		.where(eq(segmentTranslations.id, pageSegmentTranslationId))
		.limit(1);

	if (!segmentTranslation[0]) return;

	await db.insert(notifications).values({
		segmentTranslationId: pageSegmentTranslationId,
		userId: segmentTranslation[0].userId,
		actorId,
		type: "PAGE_SEGMENT_TRANSLATION_VOTE",
	});
}
