import { db } from "@/db";

/**
 * ページをタイトルとタグと共に取得
 */
export async function getPageWithTitleAndTagsBySlug(slug: string) {
	const page = await db
		.selectFrom("pages")
		.innerJoin("contents", "pages.id", "contents.id")
		.selectAll("pages")
		.select(["contents.id as contentId"])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	if (!page) return null;

	const [segments, tagPagesData] = await Promise.all([
		db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.execute(),
		db
			.selectFrom("tagPages")
			.innerJoin("tags", "tagPages.tagId", "tags.id")
			.select(["tagPages.tagId", "tagPages.pageId", "tags.name as tagName"])
			.where("tagPages.pageId", "=", page.id)
			.execute(),
	]);

	return {
		...page,
		segments,
		tagPages: tagPagesData.map((tp) => ({
			tagId: tp.tagId,
			pageId: tp.pageId,
			tag: { name: tp.tagName },
		})),
	};
}
export type PageWithTitleAndTags = Awaited<
	ReturnType<typeof getPageWithTitleAndTagsBySlug>
>;

/**
 * 全タグを取得（使用数順）
 */
export async function getAllTagsWithCount() {
	return await db
		.selectFrom("tags")
		.leftJoin("tagPages", "tags.id", "tagPages.tagId")
		.select([
			"tags.id",
			"tags.name",
			db.fn.count("tagPages.pageId").as("countPages"),
		])
		.groupBy(["tags.id", "tags.name"])
		.orderBy(db.fn.count("tagPages.pageId"), "desc")
		.execute()
		.then((results) =>
			results.map((r) => ({
				id: r.id,
				name: r.name,
				_count: {
					pages: Number(r.countPages ?? 0),
				},
			})),
		);
}
export type TagWithCount = Awaited<
	ReturnType<typeof getAllTagsWithCount>
>[number];

/**
 * ユーザーのターゲットロケールを取得
 */
export async function getUserTargetLocales(userId: string) {
	const result = await db
		.selectFrom("userSettings")
		.select("targetLocales")
		.where("userId", "=", userId)
		.executeTakeFirst();
	return result?.targetLocales ?? ["en", "zh"];
}

/**
 * ユーザーの翻訳コンテキストを取得
 */
export async function getTranslationContextsByUserId(userId: string) {
	return db
		.selectFrom("translationContexts")
		.select(["id", "name", "context", "createdAt", "updatedAt"])
		.where("userId", "=", userId)
		.orderBy("updatedAt", "desc")
		.execute();
}
