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

/** 投票結果を計算する */
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

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction().execute(async (tx) => {
		const { finalIsUpvote } = await applyVote(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
		);

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

		if (result.pageId) {
			await updateProofStatus(tx, result.pageId, result.locale);
		}

		return {
			success: true,
			data: { isUpvote: finalIsUpvote, point: result.point },
		};
	});
}

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

	await tx
		.updateTable("segmentTranslations")
		.set({ point: sql`point + ${outcome.pointDelta}` })
		.where("id", "=", segmentTranslationId)
		.execute();

	return { finalIsUpvote: outcome.finalIsUpvote };
}

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
	translationId: number,
	actorId: string,
) {
	const segmentTranslation = await db
		.selectFrom("segmentTranslations")
		.select("userId")
		.where("id", "=", translationId)
		.executeTakeFirst();

	if (!segmentTranslation) return;

	await db
		.insertInto("notifications")
		.values({
			segmentTranslationId: translationId,
			userId: segmentTranslation.userId,
			actorId,
			type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		})
		.execute();
}
