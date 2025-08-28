import type { PageComment, Prisma } from "@prisma/client";
import { ContentKind } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
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

			// 親コメントの path を取得し、子の path/depth を算出
			let path: number[] = [];
			if (p.parentId) {
				const parent = await tx.pageComment.findUnique({
					where: { id: p.parentId },
					select: { id: true, path: true },
				});
				if (parent) {
					path = [...(parent.path ?? []), parent.id];
				}
			}
			const depth = path.length;

			// ページコメントを作成（path/depth を反映）
			const created = await tx.pageComment.create({
				data: {
					pageId: p.pageId,
					userId: p.currentUserId,
					mdastJson: p.mdastJson,
					locale: p.sourceLocale,
					parentId: p.parentId,
					id: content.id,
					path,
					depth,
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

	await syncPageCommentSegments(pageComment.id, p.segments);
	return pageComment;
}

/** 1ページコメント分のセグメントを同期 */
async function syncPageCommentSegments(
	pageCommentId: number,
	drafts: SegmentDraft[],
) {
	// ページコメントに関連するContentを取得
	const pageComment = await prisma.pageComment.findUnique({
		where: { id: pageCommentId },
		select: { id: true },
	});

	if (!pageComment?.id) {
		throw new Error(`PageComment ${pageCommentId} does not have a content`);
	}

	const existing = await prisma.segment.findMany({
		where: { contentId: pageComment.id },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.segment.updateMany({
				where: { contentId: pageComment.id },
				data: { number: { increment: 1_000_000 } },
			});
		}

		// B. UPSERT を **適度なバッチ & 逐次 await** で安定
		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.segment.upsert({
						where: {
							contentId_textAndOccurrenceHash: {
								contentId: pageComment.id,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.number },
						create: {
							contentId: pageComment.id,
							text: d.text,
							number: d.number,
							textAndOccurrenceHash: d.hash,
						},
					}),
				),
			);
			for (const d of chunk) {
				stale.delete(d.hash);
			}
		}

		// C. 余った行を一括削除
		if (stale.size) {
			await tx.segment.deleteMany({
				where: {
					contentId: pageComment.id,
					textAndOccurrenceHash: { in: [...stale] },
				},
			});
		}
	});
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
