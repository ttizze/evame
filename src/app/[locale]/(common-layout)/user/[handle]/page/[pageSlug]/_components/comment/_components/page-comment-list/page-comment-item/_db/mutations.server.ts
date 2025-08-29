import { prisma } from "@/lib/prisma";

export async function deletePageComment(pageCommentId: number, userId: string) {
	return await prisma.$transaction(async (tx) => {
		// 1) 対象コメントの存在と親IDを確認
		const target = await tx.pageComment.findFirst({
			where: { id: pageCommentId, userId },
			select: { id: true, parentId: true },
		});
		if (!target) {
			throw new Error("Comment not found or not owned by user");
		}

		// 2) コメントを論理削除（本文は 'deleted' に、isDeleted を true）
		const updated = await tx.pageComment.update({
			where: { id: pageCommentId },
			data: {
				isDeleted: true,
				mdastJson: {
					type: "root",
					children: [
						{
							type: "paragraph",
							children: [{ type: "text", value: "deleted" }],
						},
					],
				},
			},
		});

		// 3) 親があれば、直下の返信数と最終返信時刻を再計算（isDeleted=false のみ対象）
		if (target.parentId) {
			const [count, maxAgg] = await Promise.all([
				tx.pageComment.count({
					where: { parentId: target.parentId, isDeleted: false },
				}),
				tx.pageComment.aggregate({
					where: { parentId: target.parentId, isDeleted: false },
					_max: { createdAt: true },
				}),
			]);

			await tx.pageComment.update({
				where: { id: target.parentId },
				data: {
					replyCount: count,
					lastReplyAt: maxAgg._max.createdAt ?? null,
				},
			});
		}

		return updated;
	});
}
