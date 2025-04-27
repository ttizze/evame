import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { prisma } from "@/lib/prisma";
import type { ProjectComment } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function upsertProjectCommentAndSegments(p: {
	projectId: number;
	projectCommentId?: number;
	parentId?: number;
	userId: string;
	sourceLocale: string;
	mdastJson: Prisma.InputJsonValue;
	segments: SegmentDraft[];
}) {
	let projectComment: ProjectComment;
	if (!p.projectCommentId) {
		projectComment = await prisma.projectComment.create({
			data: {
				projectId: p.projectId,
				userId: p.userId,
				mdastJson: p.mdastJson,
				sourceLocale: p.sourceLocale,
				parentId: p.parentId,
			},
		});
	} else {
		projectComment = await prisma.projectComment.update({
			where: { id: p.projectCommentId, userId: p.userId },
			data: { mdastJson: p.mdastJson, sourceLocale: p.sourceLocale },
		});
	}

	await syncProjectCommentSegments(projectComment.id, p.segments);
	return projectComment;
}

/** 1プロジェクト分のセグメントを同期 */
export async function syncProjectCommentSegments(
	projectCommentId: number,
	drafts: SegmentDraft[],
) {
	const existing = await prisma.projectCommentSegment.findMany({
		where: { projectCommentId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash as string));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.projectCommentSegment.updateMany({
				where: { projectCommentId },
				data: { number: { increment: 1_000_000 } },
			});
		}

		// B. UPSERT を **適度なバッチ & 逐次 await** で安定
		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.projectCommentSegment.upsert({
						where: {
							projectCommentId_textAndOccurrenceHash: {
								projectCommentId,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.number },
						create: {
							projectCommentId,
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
			await tx.projectCommentSegment.deleteMany({
				where: { projectCommentId, textAndOccurrenceHash: { in: [...stale] } },
			});
		}
	});
}

export async function createNotificationProjectComment(
	actorId: string,
	userId: string,
	projectCommentId: number,
) {
	try {
		const notification = await prisma.notification.create({
			data: {
				userId: userId,
				type: "PROJECT_COMMENT",
				projectCommentId,
				actorId: actorId,
			},
		});
		return notification;
	} catch (error) {
		console.error("Error in createNotificationProjectComment:", error);
		throw error;
	}
}
