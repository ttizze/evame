import { db } from "@/db";

/**
 * ページをタイトルとタグと共に取得
 * Kyselyに移行済み
 */
export async function getPageWithTitleAndTagsBySlug(slug: string) {
	// ページ基本情報を取得
	const page = await db
		.selectFrom("pages")
		.selectAll()
		.where("slug", "=", slug)
		.executeTakeFirst();

	if (!page) {
		return null;
	}

	// コンテンツ情報を取得（pages.id = contents.id）
	const content = await db
		.selectFrom("contents")
		.selectAll()
		.where("id", "=", page.id)
		.executeTakeFirst();

	if (!content) {
		return null;
	}

	// セグメントを取得（number = 0のみ）
	const segments = await db
		.selectFrom("segments")
		.selectAll()
		.where("contentId", "=", content.id)
		.where("number", "=", 0)
		.execute();

	// タグページとタグを取得
	const tagPagesData = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select([
			"tagPages.tagId",
			"tagPages.pageId",
			"tags.id as tag_id",
			"tags.name as tag_name",
		])
		.where("tagPages.pageId", "=", page.id)
		.execute();

	// Prismaの構造に合わせてデータを整形
	const tagPages = tagPagesData.map((tp) => ({
		tagId: tp.tagId,
		pageId: tp.pageId,
		tag: {
			id: tp.tag_id,
			name: tp.tag_name,
		},
	}));

	return {
		...page,
		content: {
			...content,
			segments,
		},
		tagPages,
	};
}
export type PageWithTitleAndTags = Awaited<
	ReturnType<typeof getPageWithTitleAndTagsBySlug>
>;

/**
 * 全タグを取得（使用数順）
 * Kyselyに移行済み
 */
export async function getAllTagsWithCount() {
	return await db
		.selectFrom("tags")
		.leftJoin("tagPages", "tags.id", "tagPages.tagId")
		.select([
			"tags.id",
			"tags.name",
			db.fn.count("tagPages.pageId").as("_count_pages"),
		])
		.groupBy(["tags.id", "tags.name"])
		.orderBy(db.fn.count("tagPages.pageId"), "desc")
		.execute()
		.then((results) =>
			results.map((r) => ({
				id: r.id,
				name: r.name,
				_count: {
					pages: Number(r._count_pages ?? 0),
				},
			})),
		);
}
export type TagWithCount = Awaited<
	ReturnType<typeof getAllTagsWithCount>
>[number];

/**
 * ユーザーのターゲットロケールを取得
 * Kyselyに移行済み
 */
export async function getUserTargetLocales(userId: string) {
	const result = await db
		.selectFrom("userSettings")
		.select("targetLocales")
		.where("userId", "=", userId)
		.executeTakeFirst();
	return result?.targetLocales ?? ["en", "zh"];
}
