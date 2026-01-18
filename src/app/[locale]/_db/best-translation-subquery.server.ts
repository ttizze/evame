import type { ExpressionBuilder } from "kysely";
import { db } from "@/db";
import type { DB } from "@/db/types";

type BestTranslationParams = {
	locale: string;
	ownerUserId: string;
};

export function bestTranslationSubquery(
	eb: ExpressionBuilder<DB, keyof DB>,
	{ locale, ownerUserId }: BestTranslationParams,
) {
	return eb
		.selectFrom("segmentTranslations")
		.leftJoin("translationVotes as ownerTv", (join) =>
			join
				.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
				.on("ownerTv.userId", "=", ownerUserId)
				.on("ownerTv.isUpvote", "=", true),
		)
		.distinctOn("segmentTranslations.segmentId")
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.text",
		])
		.where("segmentTranslations.locale", "=", locale)
		.orderBy("segmentTranslations.segmentId")
		.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc");
}

/**
 * 複数ページ一括取得用のbest translation subquery (軽量版)
 * セグメントからページを辿り、各ページのオーナーのupvoteを優先する
 */
export function bestTranslationByPagesSubquery(locale: string) {
	return db
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
		.distinctOn("segmentTranslations.segmentId")
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.text",
		])
		.where("segmentTranslations.locale", "=", locale)
		.orderBy("segmentTranslations.segmentId")
		.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc");
}

/**
 * 複数コメント一括取得用のbest translation subquery
 * セグメントからコメントを辿り、各コメントのオーナーのupvoteを優先する
 */
export function bestTranslationByCommentSubquery(locale: string) {
	return db
		.selectFrom("segmentTranslations")
		.innerJoin(
			"segments as transSeg",
			"segmentTranslations.segmentId",
			"transSeg.id",
		)
		.innerJoin(
			"pageComments as ownerComment",
			"transSeg.contentId",
			"ownerComment.id",
		)
		.leftJoin("translationVotes as ownerTv", (join) =>
			join
				.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
				.onRef("ownerTv.userId", "=", "ownerComment.userId")
				.on("ownerTv.isUpvote", "=", true),
		)
		.distinctOn("segmentTranslations.segmentId")
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.text",
		])
		.where("segmentTranslations.locale", "=", locale)
		.orderBy("segmentTranslations.segmentId")
		.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc");
}
