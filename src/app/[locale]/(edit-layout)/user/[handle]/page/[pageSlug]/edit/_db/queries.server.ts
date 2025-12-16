import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	contents,
	pages,
	segments,
	tagPages,
	tags,
	userSettings,
} from "@/drizzle/schema";

export async function getPageWithTitleAndTagsBySlug(slug: string) {
	// ページを取得
	const pageResult = await db
		.select({
			id: pages.id,
			slug: pages.slug,
			createdAt: pages.createdAt,
			updatedAt: pages.updatedAt,
			status: pages.status,
			sourceLocale: pages.sourceLocale,
			userId: pages.userId,
			mdastJson: pages.mdastJson,
			parentId: pages.parentId,
			order: pages.order,
		})
		.from(pages)
		.where(eq(pages.slug, slug))
		.limit(1);

	const page = pageResult[0];
	if (!page) {
		return null;
	}

	// セグメント（number: 0）とタグを並列取得
	const [segmentsResult, tagPagesResult] = await Promise.all([
		db
			.select({
				id: segments.id,
				contentId: segments.contentId,
				number: segments.number,
				text: segments.text,
				textAndOccurrenceHash: segments.textAndOccurrenceHash,
				createdAt: segments.createdAt,
				segmentTypeId: segments.segmentTypeId,
			})
			.from(segments)
			.innerJoin(contents, eq(segments.contentId, contents.id))
			.innerJoin(pages, eq(contents.id, pages.id))
			.where(and(eq(pages.id, page.id), eq(segments.number, 0))),
		db
			.select({
				tag: {
					id: tags.id,
					name: tags.name,
				},
			})
			.from(tagPages)
			.innerJoin(tags, eq(tagPages.tagId, tags.id))
			.where(eq(tagPages.pageId, page.id)),
	]);

	return {
		...page,
		content: {
			segments: segmentsResult,
		},
		tagPages: tagPagesResult,
	};
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
