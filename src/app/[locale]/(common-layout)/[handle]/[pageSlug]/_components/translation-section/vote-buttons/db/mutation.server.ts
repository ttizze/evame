import type { Transaction } from "kysely";
import { sql } from "kysely";
import { db } from "@/db";
import type { DB } from "@/db/types";
import { calcProofStatus } from "../_lib/translation-proof-status";

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
	return db.transaction().execute(async (tx) => {
		// 投票処理と関連情報を同時に取得
		const { finalIsUpvote } = await applyVote(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		// 更新後のpoint と ページ情報を取得
		const result = await tx
			.selectFrom("segmentTranslations")
			.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
			.innerJoin("contents", "segments.contentId", "contents.id")
			.leftJoin("pages", "contents.id", "pages.id")
			.select([
				"segmentTranslations.point",
				"segmentTranslations.locale",
				"pages.id as pageId",
			])
			.where("segmentTranslations.id", "=", segmentTranslationId)
			.executeTakeFirst();

		if (!result) {
			return { success: false, data: { isUpvote: undefined, point: 0 } };
		}

		// ページの場合のみproof statusを更新
		if (result.pageId) {
			await updateProofStatus(tx, result.pageId, result.locale);
		}

		return {
			success: true,
			data: { isUpvote: finalIsUpvote, point: result.point },
		};
	});
}

/**
 * 投票の適用とpoint更新を行う
 */
async function applyVote(
	tx: Transaction<DB>,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	const existingVote = await tx
		.selectFrom("translationVotes")
		.select("isUpvote")
		.where("translationId", "=", segmentTranslationId)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	const outcome = computeVoteOutcome(existingVote?.isUpvote, isUpvote);

	// 投票テーブルの操作
	if (outcome.action === "delete") {
		await tx
			.deleteFrom("translationVotes")
			.where("translationId", "=", segmentTranslationId)
			.where("userId", "=", currentUserId)
			.execute();
	} else if (outcome.action === "update") {
		await tx
			.updateTable("translationVotes")
			.set({ isUpvote })
			.where("translationId", "=", segmentTranslationId)
			.where("userId", "=", currentUserId)
			.execute();
	} else {
		await tx
			.insertInto("translationVotes")
			.values({
				translationId: segmentTranslationId,
				userId: currentUserId,
				isUpvote,
			})
			.execute();
	}

	// point更新
	await tx
		.updateTable("segmentTranslations")
		.set({ point: sql`point + ${outcome.pointDelta}` })
		.where("id", "=", segmentTranslationId)
		.execute();

	return { finalIsUpvote: outcome.finalIsUpvote };
}

/**
 * ページのproof statusを更新する
 * 1クエリで全カウントを取得
 */
async function updateProofStatus(
	tx: Transaction<DB>,
	pageId: number,
	locale: string,
) {
	const stats = await tx
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pages", "contents.id", "pages.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segmentTranslations.segmentId", "=", "segments.id")
				.on("segmentTranslations.locale", "=", locale),
		)
		.select([
			sql<number>`count(*)::int`.as("totalSegments"),
			sql<number>`count(case when segment_translations.point >= 1 then 1 end)::int`.as(
				"segmentsWith1PlusVotes",
			),
			sql<number>`count(case when segment_translations.point >= 2 then 1 end)::int`.as(
				"segmentsWith2PlusVotes",
			),
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	const { totalSegments, segmentsWith1PlusVotes, segmentsWith2PlusVotes } =
		stats ?? {
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
		.insertInto("pageLocaleTranslationProofs")
		.values({ pageId, locale, translationProofStatus: newStatus })
		.onConflict((oc) =>
			oc.columns(["pageId", "locale"]).doUpdateSet({
				translationProofStatus: newStatus,
			}),
		)
		.execute();
}

export async function createNotificationPageSegmentTranslationVote(
	pageSegmentTranslationId: number,
	actorId: string,
) {
	const segmentTranslation = await db
		.selectFrom("segmentTranslations")
		.select("userId")
		.where("id", "=", pageSegmentTranslationId)
		.executeTakeFirst();

	if (!segmentTranslation) return;

	await db
		.insertInto("notifications")
		.values({
			segmentTranslationId: pageSegmentTranslationId,
			userId: segmentTranslation.userId,
			actorId,
			type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		})
		.execute();
}
