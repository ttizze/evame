import { type ExpressionBuilder, sql } from "kysely";
import { db } from "@/db";
import type { DB } from "@/db/types";

export const bestTranslationRank = sql<number>`row_number() over (partition by segment_translations.segment_id order by owner_tv.is_upvote desc nulls last, segment_translations.point desc, segment_translations.created_at desc, segment_translations.id desc)`;

type BestTranslationParams = {
	locale: string;
	ownerUserId: string;
};

export function bestTranslationSubquery(
	eb: ExpressionBuilder<DB, keyof DB>,
	{ locale, ownerUserId }: BestTranslationParams,
) {
	return eb
		.selectFrom(
			eb
				.selectFrom("segmentTranslations")
				.leftJoin("translationVotes as ownerTv", (join) =>
					join
						.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
						.on("ownerTv.userId", "=", ownerUserId)
						.on("ownerTv.isUpvote", "=", true),
				)
				.select([
					"segmentTranslations.id",
					"segmentTranslations.segmentId",
					"segmentTranslations.text",
					bestTranslationRank.as("translationRank"),
				])
				.where("segmentTranslations.locale", "=", locale)
				.as("rankedTranslations"),
		)
		.select(["id", "segmentId", "text"])
		.where("translationRank", "=", 1);
}

/**
 * 複数ページ一括取得用のbest translation subquery (軽量版)
 * セグメントからページを辿り、各ページのオーナーのupvoteを優先する
 */
export function bestTranslationByPagesSubquery(locale: string) {
	return db
		.selectFrom(
			db
				.selectFrom("segmentTranslations")
				.innerJoin(
					"segments as transSeg",
					"segmentTranslations.segmentId",
					"transSeg.id",
				)
				.innerJoin("pages as ownerPage", "transSeg.contentId", "ownerPage.id")
				.leftJoin("translationVotes as ownerTv", (join) =>
					join
						.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
						.onRef("ownerTv.userId", "=", "ownerPage.userId")
						.on("ownerTv.isUpvote", "=", true),
				)
				.select([
					"segmentTranslations.id",
					"segmentTranslations.segmentId",
					"segmentTranslations.text",
					bestTranslationRank.as("translationRank"),
				])
				.where("segmentTranslations.locale", "=", locale)
				.as("rankedTranslations"),
		)
		.select(["id", "segmentId", "text"])
		.where("translationRank", "=", 1);
}
