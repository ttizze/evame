/**
 * ページコメントリスト用のヘルパー関数
 */

import { buildSegmentsMap } from "@/app/[locale]/_db/page-list-helpers.server";
import { db } from "@/db";

/**
 * 複数コメントのセグメントを取得（最良の翻訳1件のみ）
 */
export async function fetchSegmentsForCommentIds(
	commentIds: number[],
	locale: string,
) {
	if (commentIds.length === 0) return [];

	const allSegments = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segments.id", "=", "segmentTranslations.segmentId")
				.on("segmentTranslations.locale", "=", locale),
		)
		.leftJoin("users", "segmentTranslations.userId", "users.id")
		.select([
			"segments.id as segmentId",
			"segments.contentId as segmentContentId",
			"segments.number as segmentNumber",
			"segments.text as segmentText",
			"segments.textAndOccurrenceHash as segmentTextAndOccurrenceHash",
			"segments.createdAt as segmentCreatedAt",
			"segments.segmentTypeId as segmentSegmentTypeId",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"segmentTranslations.id as translationId",
			"segmentTranslations.segmentId as translationSegmentId",
			"segmentTranslations.userId as translationUserId",
			"segmentTranslations.locale as translationLocale",
			"segmentTranslations.text as translationText",
			"segmentTranslations.point as translationPoint",
			"segmentTranslations.createdAt as translationCreatedAt",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("segments.contentId", "in", commentIds)
		.orderBy("segments.id")
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.execute();

	// buildSegmentsMap用にデータを変換
	const mappedSegments = allSegments.map((row) => ({
		segment: {
			id: row.segmentId,
			contentId: row.segmentContentId,
			number: row.segmentNumber,
			text: row.segmentText,
			textAndOccurrenceHash: row.segmentTextAndOccurrenceHash,
			createdAt: row.segmentCreatedAt,
			segmentTypeId: row.segmentSegmentTypeId,
		},
		segmentType: {
			key: row.segmentTypeKey,
			label: row.segmentTypeLabel,
		},
		translation: row.translationId
			? {
					id: row.translationId,
					segmentId: row.translationSegmentId!,
					userId: row.translationUserId!,
					locale: row.translationLocale!,
					text: row.translationText!,
					point: row.translationPoint!,
					createdAt: row.translationCreatedAt!,
				}
			: null,
		translationUser: row.userId
			? {
					id: row.userId,
					name: row.userName!,
					handle: row.userHandle!,
					image: row.userImage!,
					createdAt: row.userCreatedAt!,
					updatedAt: row.userUpdatedAt!,
					profile: row.userProfile!,
					twitterHandle: row.userTwitterHandle!,
					totalPoints: row.userTotalPoints!,
					isAI: row.userIsAI!,
					plan: row.userPlan!,
				}
			: null,
	}));

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = buildSegmentsMap(mappedSegments);

	return Array.from(segmentsMap.values());
}
