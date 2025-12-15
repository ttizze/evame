import { and, count, eq, max } from "drizzle-orm";
import type { Root as MdastRoot } from "mdast";
import { db } from "@/drizzle";
import { pageComments } from "@/drizzle/schema";

export async function deletePageComment(pageCommentId: number, userId: string) {
	return db.transaction(async (tx) => {
		// コメントを論理削除（本文は 'deleted' に、isDeleted を true）
		const deletedMdast: MdastRoot = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", value: "deleted" }],
				},
			],
		};

		const [updated] = await tx
			.update(pageComments)
			.set({
				isDeleted: true,
				mdastJson: deletedMdast,
			})
			.where(
				and(
					eq(pageComments.id, pageCommentId),
					eq(pageComments.userId, userId),
				),
			)
			.returning({ parentId: pageComments.parentId });

		if (!updated) {
			throw new Error("Comment not found or not owned by user");
		}

		// 親があれば、直下の返信数と最終返信時刻を再計算（isDeleted=false のみ対象）
		if (updated.parentId) {
			const [stats] = await tx
				.select({
					replyCount: count(),
					lastReplyAt: max(pageComments.createdAt),
				})
				.from(pageComments)
				.where(
					and(
						eq(pageComments.parentId, updated.parentId),
						eq(pageComments.isDeleted, false),
					),
				);

			await tx
				.update(pageComments)
				.set({
					replyCount: Number(stats?.replyCount ?? 0),
					lastReplyAt: stats?.lastReplyAt ?? null,
				})
				.where(eq(pageComments.id, updated.parentId));
		}

		return updated;
	});
}
