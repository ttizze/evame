import type { PageComment, Prisma } from "@prisma/client";
import { ContentKind } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_lib/sync-segments";
import { prisma } from "@/lib/prisma";
export async function upsertPageCommentAndSegments(p: {
	pageId: number;
	pageCommentId?: number;
	parentId?: number;
	currentUserId: string;
	sourceLocale: string;
	mdastJson: Prisma.InputJsonValue;
	segments: SegmentDraft[];
}) {
	let pageComment: PageComment;
	if (!p.pageCommentId) {
		pageComment = await prisma.$transaction(async (tx) => {
			// コンテンツを作成
			const content = await tx.content.create({
				data: {
					kind: ContentKind.PAGE_COMMENT,
				},
			});

			// ページコメントを作成
			const created = await tx.pageComment.create({
				data: {
					pageId: p.pageId,
					userId: p.currentUserId,
					mdastJson: p.mdastJson,
					locale: p.sourceLocale,
					parentId: p.parentId,
					id: content.id,
				},
			});

			// 親の直下返信数/最終返信時刻を更新（直下のみ）
			if (p.parentId) {
				await tx.pageComment.update({
					where: { id: p.parentId },
					data: {
						replyCount: { increment: 1 },
						lastReplyAt: created.createdAt,
					},
				});
			}

			return created;
		});
	} else {
		pageComment = await prisma.pageComment.update({
			where: { id: p.pageCommentId, userId: p.currentUserId },
			data: { mdastJson: p.mdastJson, locale: p.sourceLocale },
		});
	}

	await syncSegments(prisma, pageComment.id, p.segments);
	return pageComment;
}

export async function createNotificationPageComment(
	actorId: string,
	userId: string,
	pageCommentId: number,
) {
	try {
		const notification = await prisma.notification.create({
			data: {
				userId: userId,
				type: "PAGE_COMMENT",
				pageCommentId,
				actorId: actorId,
			},
		});
		return notification;
	} catch (error) {
		console.error("Error in createNotificationPageComment:", error);
		throw error;
	}
}
