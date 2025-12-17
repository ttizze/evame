/**
 * ページコメントリスト用のヘルパー関数
 */

import { db } from "@/db";

/**
 * 複数コメントのセグメントを取得（DISTINCT ONで最良の翻訳1件のみ）
 */
export async function fetchSegmentsForCommentIds(
	commentIds: number[],
	locale: string,
) {
	if (commentIds.length === 0) return [];

	const rows = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(
			// DISTINCT ON で各セグメントの最良翻訳を1件のみ
			(eb) =>
				eb
					.selectFrom("segmentTranslations")
					.innerJoin("users", "segmentTranslations.userId", "users.id")
					.distinctOn("segmentTranslations.segmentId")
					.select([
						"segmentTranslations.id",
						"segmentTranslations.segmentId",
						"segmentTranslations.userId",
						"segmentTranslations.locale",
						"segmentTranslations.text",
						"segmentTranslations.point",
						"segmentTranslations.createdAt",
						"users.name as userName",
						"users.handle as userHandle",
						"users.image as userImage",
						"users.createdAt as userCreatedAt",
						"users.updatedAt as userUpdatedAt",
						"users.profile as userProfile",
						"users.twitterHandle as userTwitterHandle",
						"users.totalPoints as userTotalPoints",
						"users.isAi as userIsAi",
						"users.plan as userPlan",
					])
					.where("segmentTranslations.locale", "=", locale)
					.orderBy("segmentTranslations.segmentId")
					.orderBy("segmentTranslations.point", "desc")
					.orderBy("segmentTranslations.createdAt", "desc")
					.as("trans"),
			(join) => join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"segments.id",
			"segments.contentId",
			"segments.number",
			"segments.text",
			"segments.textAndOccurrenceHash",
			"segments.createdAt",
			"segments.segmentTypeId",
			"segmentTypes.key as typeKey",
			"segmentTypes.label as typeLabel",
			"trans.id as transId",
			"trans.segmentId as transSegmentId",
			"trans.userId as transUserId",
			"trans.locale as transLocale",
			"trans.text as transText",
			"trans.point as transPoint",
			"trans.createdAt as transCreatedAt",
			"trans.userName",
			"trans.userHandle",
			"trans.userImage",
			"trans.userCreatedAt",
			"trans.userUpdatedAt",
			"trans.userProfile",
			"trans.userTwitterHandle",
			"trans.userTotalPoints",
			"trans.userIsAi",
			"trans.userPlan",
		])
		.where("segments.contentId", "in", commentIds)
		.orderBy("segments.id")
		.execute();

	return rows.map((row) => ({
		id: row.id,
		contentId: row.contentId,
		number: row.number,
		text: row.text,
		textAndOccurrenceHash: row.textAndOccurrenceHash,
		createdAt: row.createdAt,
		segmentTypeId: row.segmentTypeId,
		segmentType: {
			key: row.typeKey,
			label: row.typeLabel,
		},
		segmentTranslation: row.transId
			? {
					id: row.transId,
					segmentId: row.transSegmentId!,
					userId: row.transUserId!,
					locale: row.transLocale!,
					text: row.transText!,
					point: row.transPoint!,
					createdAt: row.transCreatedAt!,
					user: {
						id: row.transUserId!,
						name: row.userName!,
						handle: row.userHandle!,
						image: row.userImage!,
						createdAt: row.userCreatedAt!,
						updatedAt: row.userUpdatedAt!,
						profile: row.userProfile!,
						twitterHandle: row.userTwitterHandle!,
						totalPoints: row.userTotalPoints!,
						isAi: row.userIsAi!,
						plan: row.userPlan!,
					},
				}
			: null,
	}));
}
