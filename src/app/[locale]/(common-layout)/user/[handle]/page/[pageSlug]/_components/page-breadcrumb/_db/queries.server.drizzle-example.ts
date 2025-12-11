// Drizzle版の実装例（参考用）

import { and, desc, eq } from "drizzle-orm";
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

// 翻訳のユーザー情報用のエイリアス
const translationUsers = alias(users, "translation_users");

// 親ページの階層を取得する関数（Drizzle版）
export async function getParentChain(pageId: number, locale: string) {
	const parentChain: Array<Awaited<ReturnType<typeof executeQuery>>[number]> =
		[];
	let currentParentId = await getParentId(pageId);

	async function executeQuery(parentId: number) {
		return await db
			.select({
				pageId: pages.id,
				pageSlug: pages.slug,
				pageCreatedAt: pages.createdAt,
				pageStatus: pages.status,
				pageSourceLocale: pages.sourceLocale,
				pageParentId: pages.parentId,
				pageOrder: pages.order,
				userId: users.id,
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
				translationId: segmentTranslations.id,
				translationSegmentId: segmentTranslations.segmentId,
				translationUserId: segmentTranslations.userId,
				translationLocale: segmentTranslations.locale,
				translationText: segmentTranslations.text,
				translationPoint: segmentTranslations.point,
				translationCreatedAt: segmentTranslations.createdAt,
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
			.leftJoin(
				segmentTranslations,
				and(
					eq(segments.id, segmentTranslations.segmentId),
					eq(segmentTranslations.locale, locale),
				),
			)
			.leftJoin(
				translationUsers,
				eq(segmentTranslations.userId, translationUsers.id),
			)
			.where(and(eq(pages.id, parentId), eq(segments.number, 0)))
			.orderBy(
				segments.id,
				desc(segmentTranslations.point),
				desc(segmentTranslations.createdAt),
			)
			.limit(1);
	}

	while (currentParentId) {
		const result = await executeQuery(currentParentId);

		if (!result[0] || !result[0].userId) break;

		parentChain.unshift(result[0]);

		currentParentId = result[0].pageParentId;
	}

	return parentChain;
}

// ページの親IDを取得する関数
async function getParentId(pageId: number): Promise<number | null> {
	const result = await db
		.select({ parentId: pages.parentId })
		.from(pages)
		.where(eq(pages.id, pageId))
		.limit(1);
	return result[0]?.parentId ?? null;
}
