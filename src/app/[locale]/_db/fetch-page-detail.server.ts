import { and, eq, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/drizzle";
import {
	contents,
	pages,
	segments,
	segmentTranslations,
	segmentTypes,
	users,
} from "@/drizzle/schema";

// 翻訳ユーザー用エイリアス
const translationUsers = alias(users, "translation_users");

export async function fetchPageDetail(slug: string, locale: string) {
	// セグメントごとの最良翻訳を絞るサブクエリ
	const bestTranslations = db
		.select({
			segmentId: segmentTranslations.segmentId,
			translationId: segmentTranslations.id,
			translationUserId: segmentTranslations.userId,
			translationLocale: segmentTranslations.locale,
			translationText: segmentTranslations.text,
			translationPoint: segmentTranslations.point,
			translationCreatedAt: segmentTranslations.createdAt,
			rn: sql<number>`row_number() over (partition by ${segmentTranslations.segmentId} order by ${segmentTranslations.point} desc, ${segmentTranslations.createdAt} desc)`.as(
				"rn",
			),
		})
		.from(segmentTranslations)
		.where(eq(segmentTranslations.locale, locale))
		.as("bestTranslations");

	// ページ・ユーザー・セグメント・最良翻訳をまとめて取得
	const rows = await db
		.select({
			pageId: pages.id,
			pageSlug: pages.slug,
			pageCreatedAt: pages.createdAt,
			pageUpdatedAt: pages.updatedAt,
			pageStatus: pages.status,
			pageSourceLocale: pages.sourceLocale,
			pageParentId: pages.parentId,
			pageOrder: pages.order,
			pageMdastJson: pages.mdastJson,
			userId: pages.userId,
			userName: users.name,
			userHandle: users.handle,
			userImage: users.image,
			userCreatedAt: users.createdAt,
			userUpdatedAt: users.updatedAt,
			userProfile: users.profile,
			userTwitterHandle: users.twitterHandle,
			userTotalPoints: users.totalPoints,
			userIsAI: users.isAI,
			userPlan: users.plan,
			segmentId: segments.id,
			segmentNumber: segments.number,
			segmentText: segments.text,
			segmentTypeKey: segmentTypes.key,
			segmentTypeLabel: segmentTypes.label,
			translationId: bestTranslations.translationId,
			translationSegmentId: bestTranslations.segmentId,
			translationUserId: bestTranslations.translationUserId,
			translationLocale: bestTranslations.translationLocale,
			translationText: bestTranslations.translationText,
			translationPoint: bestTranslations.translationPoint,
			translationCreatedAt: bestTranslations.translationCreatedAt,
			translationUserName: translationUsers.name,
			translationUserHandle: translationUsers.handle,
			translationUserImage: translationUsers.image,
			translationUserCreatedAt: translationUsers.createdAt,
			translationUserUpdatedAt: translationUsers.updatedAt,
			translationUserProfile: translationUsers.profile,
			translationUserTwitterHandle: translationUsers.twitterHandle,
			translationUserTotalPoints: translationUsers.totalPoints,
			translationUserIsAI: translationUsers.isAI,
			translationUserPlan: translationUsers.plan,
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.innerJoin(contents, eq(pages.id, contents.id))
		.innerJoin(segments, eq(contents.id, segments.contentId))
		.innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
		.leftJoin(bestTranslations, eq(bestTranslations.segmentId, segments.id))
		.leftJoin(
			translationUsers,
			eq(bestTranslations.translationUserId, translationUsers.id),
		)
		.where(
			and(
				eq(pages.slug, slug),
				or(isNull(bestTranslations.rn), eq(bestTranslations.rn, 1)),
			),
		)
		.orderBy(segments.number, segments.id);

	if (!rows[0]) return null;

	// ページ情報は先頭行から組み立て
	const page = rows[0];

	// セグメント配列を構築（1セグメント1行になっている）
	const segmentsNormalized = rows.map((row) => ({
		id: row.segmentId,
		number: row.segmentNumber,
		text: row.segmentText,
		segmentType: {
			key: row.segmentTypeKey,
			label: row.segmentTypeLabel,
		},
		segmentTranslation:
			row.translationId && row.translationUserId
				? {
						id: row.translationId,
						segmentId: row.translationSegmentId ?? row.segmentId,
						userId: row.translationUserId,
						locale: row.translationLocale ?? locale,
						text: row.translationText ?? "",
						point: row.translationPoint ?? 0,
						createdAt: row.translationCreatedAt ?? new Date(),
						user: {
							id: row.translationUserId,
							name: row.translationUserName ?? "",
							handle: row.translationUserHandle ?? "",
							image: row.translationUserImage ?? "",
							createdAt: row.translationUserCreatedAt ?? new Date(),
							updatedAt: row.translationUserUpdatedAt ?? new Date(),
							profile: row.translationUserProfile ?? "",
							twitterHandle: row.translationUserTwitterHandle ?? "",
							totalPoints: row.translationUserTotalPoints ?? 0,
							isAI: row.translationUserIsAI ?? false,
							plan: row.translationUserPlan ?? "",
						},
					}
				: null,
	}));

	return {
		id: page.pageId,
		slug: page.pageSlug,
		createdAt: page.pageCreatedAt,
		updatedAt: page.pageUpdatedAt,
		status: page.pageStatus,
		sourceLocale: page.pageSourceLocale,
		parentId: page.pageParentId,
		order: page.pageOrder,
		mdastJson: page.pageMdastJson,
		userId: page.userId,
		user: {
			id: page.userId,
			name: page.userName ?? "",
			handle: page.userHandle ?? "",
			image: page.userImage ?? "",
			createdAt: page.userCreatedAt ?? new Date(),
			updatedAt: page.userUpdatedAt ?? new Date(),
			profile: page.userProfile ?? "",
			twitterHandle: page.userTwitterHandle ?? "",
			totalPoints: page.userTotalPoints ?? 0,
			isAI: page.userIsAI ?? false,
			plan: page.userPlan ?? "",
		},
		content: {
			segments: segmentsNormalized,
		},
	};
}
