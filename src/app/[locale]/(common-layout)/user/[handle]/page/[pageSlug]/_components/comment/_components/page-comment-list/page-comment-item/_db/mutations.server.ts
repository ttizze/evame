import { sql } from "kysely";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";

export async function deletePageComment(pageCommentId: number, userId: string) {
	return db.transaction().execute(async (tx) => {
		// コメントを論理削除（本文は 'deleted' に、isDeleted を true）
		const deletedMdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", value: "deleted" }],
				},
			],
		};

		const updated = await tx
			.updateTable("pageComments")
			.set({
				isDeleted: true,
				mdastJson: deletedMdast,
			})
			.where("id", "=", pageCommentId)
			.where("userId", "=", userId)
			.returning(["parentId"])
			.executeTakeFirst();

		if (!updated) {
			throw new Error("Comment not found or not owned by user");
		}

		// 親があれば、直下の返信数と最終返信時刻を再計算（isDeleted=false のみ対象）
		if (updated.parentId) {
			const stats = await tx
				.selectFrom("pageComments")
				.select([
					sql<number>`count(*)::int`.as("replyCount"),
					sql<Date | null>`max(created_at)`.as("lastReplyAt"),
				])
				.where("parentId", "=", updated.parentId)
				.where("isDeleted", "=", false)
				.executeTakeFirst();

			await tx
				.updateTable("pageComments")
				.set({
					replyCount: Number(stats?.replyCount ?? 0),
					lastReplyAt: stats?.lastReplyAt ?? null,
				})
				.where("id", "=", updated.parentId)
				.execute();
		}

		return updated;
	});
}
