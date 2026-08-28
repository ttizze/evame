import { db } from "@/db";

export async function upsertTags(tagNames: string[], pageId: number) {
	const uniqueTagNames = Array.from(new Set(tagNames));

	if (uniqueTagNames.length === 0) {
		await db.deleteFrom("tagPages").where("pageId", "=", pageId).execute();
		return [];
	}

	// 既存タグを取得
	const existingTags = await db
		.selectFrom("tags")
		.selectAll()
		.where("name", "in", uniqueTagNames)
		.execute();

	const existingNames = new Set(existingTags.map((t) => t.name));
	const newNames = uniqueTagNames.filter((name) => !existingNames.has(name));

	// 新規タグのみinsert
	const insertedTags =
		newNames.length > 0
			? await db
					.insertInto("tags")
					.values(newNames.map((name) => ({ name })))
					.returningAll()
					.execute()
			: [];

	const allTags = [...existingTags, ...insertedTags];

	// tagPagesをupsert
	await db
		.insertInto("tagPages")
		.values(allTags.map((tag) => ({ tagId: tag.id, pageId })))
		.onConflict((oc) => oc.doNothing())
		.execute();

	// 不要なtagPagesを削除
	const tagIdsToKeep = allTags.map((tag) => tag.id);
	await db
		.deleteFrom("tagPages")
		.where("pageId", "=", pageId)
		.where("tagId", "not in", tagIdsToKeep)
		.execute();

	return allTags;
}
