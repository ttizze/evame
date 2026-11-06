import type { Expression } from "kysely";
import { db } from "@/db";

export function bestTranslationId(
	segmentId: Expression<number>,
	ownerUserId: Expression<string>,
	locale: string,
) {
	return db
		.selectFrom("segmentTranslations")
		.leftJoin("translationVotes as ownerTv", (join) =>
			join
				.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
				.on("ownerTv.userId", "=", ownerUserId)
				.on("ownerTv.isUpvote", "=", true),
		)
		.select("segmentTranslations.id")
		.where("segmentTranslations.segmentId", "=", segmentId)
		.where("segmentTranslations.locale", "=", locale)
		.orderBy("ownerTv.isUpvote", "desc")
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.orderBy("segmentTranslations.id", "desc")
		.limit(1);
}
