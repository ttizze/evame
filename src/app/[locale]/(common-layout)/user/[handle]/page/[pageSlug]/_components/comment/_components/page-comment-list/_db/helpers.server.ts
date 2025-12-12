/**
 * ページコメントリスト用のヘルパー関数
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { buildSegmentsMap } from "@/app/[locale]/_db/fetch-page-detail.server";
import { db } from "@/drizzle";
import {
	segments,
	segmentTranslations,
	segmentTypes,
	users,
} from "@/drizzle/schema";

/**
 * 複数コメントのセグメントを取得（最良の翻訳1件のみ）
 */
export async function fetchSegmentsForCommentIds(
	commentIds: number[],
	locale: string,
) {
	if (commentIds.length === 0) return [];

	const allSegments = await db
		.select({
			segment: {
				id: segments.id,
				contentId: segments.contentId,
				number: segments.number,
				text: segments.text,
				textAndOccurrenceHash: segments.textAndOccurrenceHash,
				createdAt: segments.createdAt,
				segmentTypeId: segments.segmentTypeId,
			},
			segmentType: {
				key: segmentTypes.key,
				label: segmentTypes.label,
			},
			translation: {
				id: segmentTranslations.id,
				segmentId: segmentTranslations.segmentId,
				userId: segmentTranslations.userId,
				locale: segmentTranslations.locale,
				text: segmentTranslations.text,
				point: segmentTranslations.point,
				createdAt: segmentTranslations.createdAt,
			},
			translationUser: {
				id: users.id,
				name: users.name,
				handle: users.handle,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(segments)
		.innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
		.leftJoin(
			segmentTranslations,
			and(
				eq(segments.id, segmentTranslations.segmentId),
				eq(segmentTranslations.locale, locale),
			),
		)
		.leftJoin(users, eq(segmentTranslations.userId, users.id))
		.where(inArray(segments.contentId, commentIds))
		.orderBy(
			segments.id,
			desc(segmentTranslations.point),
			desc(segmentTranslations.createdAt),
		);

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = buildSegmentsMap(allSegments);

	return Array.from(segmentsMap.values());
}
