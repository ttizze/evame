import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { tagPages, tags } from "@/drizzle/schema";

export async function upsertTags(tagNames: string[], pageId: number) {
	const uniqueTagNames = Array.from(new Set(tagNames));

	if (uniqueTagNames.length === 0) {
		await db.delete(tagPages).where(eq(tagPages.pageId, pageId));
		return [];
	}

	// 既存タグを取得
	const existingTags = await db
		.select()
		.from(tags)
		.where(inArray(tags.name, uniqueTagNames));

	const existingNames = new Set(existingTags.map((t) => t.name));
	const newNames = uniqueTagNames.filter((name) => !existingNames.has(name));

	// 新規タグのみinsert
	const insertedTags =
		newNames.length > 0
			? await db
					.insert(tags)
					.values(newNames.map((name) => ({ name })))
					.returning()
			: [];

	const allTags = [...existingTags, ...insertedTags];

	// tagPagesをupsert
	await db
		.insert(tagPages)
		.values(allTags.map((tag) => ({ tagId: tag.id, pageId })))
		.onConflictDoNothing();

	// 不要なtagPagesを削除
	const tagIdsToKeep = allTags.map((tag) => tag.id);
	await db
		.delete(tagPages)
		.where(
			and(
				eq(tagPages.pageId, pageId),
				notInArray(tagPages.tagId, tagIdsToKeep),
			),
		);

	return allTags;
}
