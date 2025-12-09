import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { DB } from "kysely-codegen";
import { calcProofStatus } from "@/app/[locale]/(common-layout)/_components/wrap-segments/translation-section/vote-buttons/_lib/translation-proof-status";
import { db } from "@/db/kysely";

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
	const kind = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.innerJoin("contents", "contents.id", "segments.contentId")
		.select(["contents.kind"])
		.where("segmentTranslations.id", "=", segmentTranslationId)
		.executeTakeFirst();

	const contentKind = kind?.kind;
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
	return db.transaction().execute(async (trx) => {
		const { finalIsUpvote } = await applyVoteUnified(
			trx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		const segmentTranslation = await trx
			.selectFrom("segmentTranslations")
			.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
			.innerJoin("contents", "contents.id", "segments.contentId")
			.leftJoin("pages", "pages.id", "contents.id")
			.select([
				"segmentTranslations.locale",
				"segmentTranslations.point",
				"pages.id as pageId",
			])
			.where("segmentTranslations.id", "=", segmentTranslationId)
			.executeTakeFirst();

		if (!segmentTranslation) {
			return {
				success: false,
				data: { isUpvote: undefined, point: 0 },
			};
		}

		const pageId = segmentTranslation.pageId;
		const { locale } = segmentTranslation;

		if (pageId) {
			await updateProofStatus(trx, pageId, locale);
		}

		return {
			success: true,
			data: { isUpvote: finalIsUpvote, point: segmentTranslation.point },
		};
	});
}

async function updateProofStatus(
	trx: Kysely<DB>,
	pageId: number,
	locale: string,
) {
	const totalSegmentsResult = await trx
		.selectFrom("segments")
		.innerJoin("contents", "contents.id", "segments.contentId")
		.innerJoin("pages", "pages.id", "contents.id")
		.select(({ fn }) => [fn.count<number>("segments.id").as("count")])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	const totalSegments = totalSegmentsResult?.count ?? 0;
	if (totalSegments === 0) return;

	const segmentsWith1PlusVotesResult = await trx
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.innerJoin("contents", "contents.id", "segments.contentId")
		.innerJoin("pages", "pages.id", "contents.id")
		.select(({ fn }) => [
			fn.count<number>("segmentTranslations.id").as("count"),
		])
		.where("pages.id", "=", pageId)
		.where("segmentTranslations.locale", "=", locale)
		.where("segmentTranslations.point", ">=", 1)
		.executeTakeFirst();

	const segmentsWith1PlusVotes = segmentsWith1PlusVotesResult?.count ?? 0;

	const segmentsWith2PlusVotesResult = await trx
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.innerJoin("contents", "contents.id", "segments.contentId")
		.innerJoin("pages", "pages.id", "contents.id")
		.select(({ fn }) => [
			fn.count<number>("segmentTranslations.id").as("count"),
		])
		.where("pages.id", "=", pageId)
		.where("segmentTranslations.locale", "=", locale)
		.where("segmentTranslations.point", ">=", 2)
		.executeTakeFirst();

	const segmentsWith2PlusVotes = segmentsWith2PlusVotesResult?.count ?? 0;

	const newStatus = await calcProofStatus(
		totalSegments,
		segmentsWith1PlusVotes,
		segmentsWith2PlusVotes,
	);

	await trx
		.insertInto("pageLocaleTranslationProofs")
		.values({
			pageId,
			locale,
			translationProofStatus: newStatus,
		})
		.onConflict((oc) =>
			oc.columns(["pageId", "locale"]).doUpdateSet({
				translationProofStatus: newStatus,
			}),
		)
		.execute();
}

/* 投票と point 更新（統一テーブル）を行い、最終的な isUpvote を返す */
async function applyVoteUnified(
	trx: Kysely<DB>,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	const existingVote = await trx
		.selectFrom("translationVotes")
		.selectAll()
		.where("translationId", "=", segmentTranslationId)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	const outcome = computeVoteOutcome(
		existingVote?.isUpvote ?? undefined,
		isUpvote,
	);

	switch (outcome.action) {
		case "delete":
			await trx
				.deleteFrom("translationVotes")
				.where("translationId", "=", segmentTranslationId)
				.where("userId", "=", currentUserId)
				.execute();
			break;
		case "update":
			await trx
				.updateTable("translationVotes")
				.set({ isUpvote })
				.where("translationId", "=", segmentTranslationId)
				.where("userId", "=", currentUserId)
				.execute();
			break;
		case "create":
			await trx
				.insertInto("translationVotes")
				.values({
					translationId: segmentTranslationId,
					userId: currentUserId,
					isUpvote,
				})
				.execute();
	}

	// point を increment する（Kysely には increment がないので sql を使う）
	await trx
		.updateTable("segmentTranslations")
		.set({
			point: sql`point + ${outcome.pointDelta}`,
		})
		.where("id", "=", segmentTranslationId)
		.execute();

	return { finalIsUpvote: outcome.finalIsUpvote };
}

async function processCommentVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction().execute(async (trx) => {
		const { finalIsUpvote } = await applyVoteUnified(
			trx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

		const updatedTranslation = await trx
			.selectFrom("segmentTranslations")
			.select(["point"])
			.where("id", "=", segmentTranslationId)
			.executeTakeFirst();

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
	const segmentTranslation = await db
		.selectFrom("segmentTranslations")
		.innerJoin("users", "users.id", "segmentTranslations.userId")
		.select(["users.id as userId"])
		.where("segmentTranslations.id", "=", pageSegmentTranslationId)
		.executeTakeFirst();

	if (!segmentTranslation) {
		return;
	}
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
