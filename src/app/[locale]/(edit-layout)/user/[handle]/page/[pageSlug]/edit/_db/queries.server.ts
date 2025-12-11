import { count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { tagPages, tags, userSettings } from "@/drizzle/schema";
import { prisma } from "@/lib/prisma";

export async function getPageWithTitleAndTagsBySlug(slug: string) {
	return await prisma.page.findUnique({
		where: { slug },
		include: {
			content: {
				include: {
					segments: {
						where: { number: 0 },
					},
				},
			},
			tagPages: {
				include: {
					tag: true,
				},
			},
		},
	});
}
export type PageWithTitleAndTags = Awaited<
	ReturnType<typeof getPageWithTitleAndTagsBySlug>
>;

/**
 * 全タグを取得（使用数順）
 * Drizzleに移行済み
 */
export async function getAllTagsWithCount() {
	return await db
		.select({
			id: tags.id,
			name: tags.name,
			_count: {
				pages: count(tagPages.pageId),
			},
		})
		.from(tags)
		.leftJoin(tagPages, eq(tags.id, tagPages.tagId))
		.groupBy(tags.id, tags.name)
		.orderBy(desc(count(tagPages.pageId)));
}
export type TagWithCount = Awaited<
	ReturnType<typeof getAllTagsWithCount>
>[number];

/**
 * ユーザーのターゲットロケールを取得
 * Drizzleに移行済み
 */
export async function getUserTargetLocales(userId: string) {
	const result = await db
		.select({ targetLocales: userSettings.targetLocales })
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);
	return result[0]?.targetLocales ?? ["en", "zh"];
}
