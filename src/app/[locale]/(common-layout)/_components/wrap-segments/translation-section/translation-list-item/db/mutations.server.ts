import { sql } from "kysely";
import { db } from "@/db";

export const deleteOwnTranslation = async (
	currentHandle: string,
	translationId: number,
) => {
	// 1回のクエリで翻訳IDとユーザーのhandleをチェックして削除
	const deleted = await db
		.deleteFrom("segmentTranslations")
		.where("id", "=", translationId)
		.where((eb) =>
			eb.exists(
				eb
					.selectFrom("users")
					.select(sql`1`.as("one"))
					.whereRef("users.id", "=", "segmentTranslations.userId")
					.where("users.handle", "=", currentHandle),
			),
		)
		.returningAll()
		.execute();

	if (deleted.length === 0) {
		// 翻訳が見つからないか、権限がない
		return { error: "Translation not found or unauthorized" };
	}
};
