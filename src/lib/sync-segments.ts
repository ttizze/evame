import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/** セグメントをupsertで同期する（トランザクション内で呼ぶこと） */
export async function syncSegments(
	tx: TransactionClient,
	contentId: number,
	drafts: SegmentDraft[],
	segmentTypeId?: number,
) {
	const existing = await tx.segment.findMany({
		where: { contentId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash));

	// segmentTypeId が指定されていない場合は PRIMARY を取得
	const typeId =
		segmentTypeId ??
		(await tx.segmentType.findUnique({ where: { key: "PRIMARY" } }))?.id;

	if (!typeId) {
		throw new Error("Primary segment type not found");
	}

	// A. 並び避難（既存あれば）
	if (existing.length) {
		await tx.segment.updateMany({
			where: { contentId },
			data: { number: { increment: 1_000_000 } },
		});
	}

	// B. UPSERT を適度なバッチで安定
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
						segmentTypeId: typeId,
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
				contentId,
				textAndOccurrenceHash: { in: [...stale] },
			},
		});
	}
}
