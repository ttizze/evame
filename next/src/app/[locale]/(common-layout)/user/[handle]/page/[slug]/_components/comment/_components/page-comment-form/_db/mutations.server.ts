import { collectSegments } from "@/app/[locale]/_lib/collect-segments";
import type { SegmentDraft } from "@/app/[locale]/_lib/collect-segments";
import type { AstNode } from "@/app/types/ast-node";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
export async function createPageComment({
	contentJson,
	sourceLocale,
	userId,
	pageId,
	parentId,
}: {
	contentJson: AstNode;
	sourceLocale: string;
	userId: string;
	pageId: number;
	parentId?: number;
}) {
	return await prisma.pageComment.create({
		data: {
			contentJson: contentJson as Prisma.InputJsonValue,
			content: "test",
			sourceLocale,
			pageId,
			userId,
			parentId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
		},
	});
}
export async function upsertPageCommentAndSegments(params: {
	pageId: number;
	commentId: number;
	userId: string;
	contentJson: AstNode; // TipTap / Lexical など何でも OK
	sourceLocale: string;
}) {
	const { segments, jsonWithHash } = collectSegments({
		root: params.contentJson,
	});

	const pageComment = await prisma.pageComment.upsert({
		where: { id: params.commentId },
		update: { contentJson: jsonWithHash as Prisma.InputJsonValue },
		create: {
			id: params.commentId,
			userId: params.userId,
			content: "test",
			contentJson: jsonWithHash as Prisma.InputJsonValue,
			sourceLocale: params.sourceLocale,
			pageId: params.pageId,
		},
	});

	await syncPageCommentSegments(pageComment.id, segments);
}

export async function syncPageCommentSegments(
	pageCommentId: number,
	drafts: SegmentDraft[],
) {
	const existing = await prisma.pageCommentSegment.findMany({
		where: { pageCommentId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash as string));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.pageCommentSegment.updateMany({
				where: { pageCommentId },
				data: { number: { increment: 1_000_000 } },
			});
		}

		// B. UPSERT を **適度なバッチ & 逐次 await** で安定
		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.pageCommentSegment.upsert({
						where: {
							pageCommentId_textAndOccurrenceHash: {
								pageCommentId,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.order },
						create: {
							pageCommentId,
							text: d.text,
							number: d.order,
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
			await tx.pageCommentSegment.deleteMany({
				where: { pageCommentId, textAndOccurrenceHash: { in: [...stale] } },
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
