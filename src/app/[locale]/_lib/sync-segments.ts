import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

/**
 * SegmentDraft[] を segments テーブルに同期する共通ヘルパー。
 * textAndOccurrenceHash をキーに既存レコードを保持しつつ更新する。
 */
export async function syncSegments(
	prisma: PrismaClient,
	contentId: number,
	drafts: SegmentDraft[],
) {
	if (!drafts.length) {
		await prisma.segment.deleteMany({ where: { contentId } });
		return;
	}

	const existing = await prisma.segment.findMany({
		where: { contentId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash));

	await prisma.$transaction(async (tx) => {
		if (existing.length) {
			await tx.segment.updateMany({
				where: { contentId },
				data: { number: { increment: 1_000_000 } },
			});
		}

		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.segment.upsert({
						where: {
							contentId_textAndOccurrenceHash: {
								contentId,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.number },
						create: {
							contentId,
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

		if (stale.size) {
			await tx.segment.deleteMany({
				where: {
					contentId,
					textAndOccurrenceHash: { in: [...stale] },
				},
			});
		}
	});
}
