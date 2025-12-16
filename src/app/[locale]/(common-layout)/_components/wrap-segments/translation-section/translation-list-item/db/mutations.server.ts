import { and, eq, exists } from "drizzle-orm";
import { db } from "@/drizzle";
import { segmentTranslations, users } from "@/drizzle/schema";

export const deleteOwnTranslation = async (
	currentHandle: string,
	translationId: number,
) => {
	// 1回のクエリで翻訳IDとユーザーのhandleをチェックして削除
	const deleted = await db
		.delete(segmentTranslations)
		.where(
			and(
				eq(segmentTranslations.id, translationId),
				exists(
					db
						.select()
						.from(users)
						.where(
							and(
								eq(users.id, segmentTranslations.userId),
								eq(users.handle, currentHandle),
							),
						),
				),
			),
		)
		.returning();

	if (deleted.length === 0) {
		// 翻訳が見つからないか、権限がない
		return { error: "Translation not found or unauthorized" };
	}
};
