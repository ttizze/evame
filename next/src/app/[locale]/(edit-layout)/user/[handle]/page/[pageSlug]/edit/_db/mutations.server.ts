import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function upsertPageAndSegments(p: {
	pageId: number | undefined;
	pageSlug: string;
	userId: string;
	title: string;
	mdastJson: Prisma.InputJsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
}) {
	const page = await prisma.page.upsert({
		where: { slug: p.pageSlug, userId: p.userId },
		update: { mdastJson: p.mdastJson, sourceLocale: p.sourceLocale },
		create: {
			slug: p.pageSlug,
			userId: p.userId,
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
		},
	});

	await syncPageSegments(page.id, p.segments);
}

/** 1ページ分のセグメントを同期 */
async function syncPageSegments(pageId: number, drafts: SegmentDraft[]) {
	const existing = await prisma.pageSegment.findMany({
		where: { pageId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash as string));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.pageSegment.updateMany({
				where: { pageId },
				data: { number: { increment: 1_000_000 } },
			});
		}

		// B. UPSERT を **適度なバッチ & 逐次 await** で安定
		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.pageSegment.upsert({
						where: {
							pageId_textAndOccurrenceHash: {
								pageId,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.number },
						create: {
							pageId,
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
			await tx.pageSegment.deleteMany({
				where: { pageId, textAndOccurrenceHash: { in: [...stale] } },
			});
		}
	});
}

export async function upsertTags(tags: string[], pageId: number) {
	// 重複タグを除去
	const uniqueTags = Array.from(new Set(tags));

	const upsertPromises = uniqueTags.map(async (tagName) => {
		const upsertedTag = await prisma.tag.upsert({
			where: { name: tagName },
			update: {},
			create: { name: tagName },
		});

		await prisma.tagPage.upsert({
			where: {
				tagId_pageId: {
					tagId: upsertedTag.id,
					pageId: pageId,
				},
			},
			update: {},
			create: {
				tagId: upsertedTag.id,
				pageId: pageId,
			},
		});

		return upsertedTag;
	});

	const updatedTags = await Promise.all(upsertPromises);

	const tagIdsToKeep = updatedTags.map((tag) => tag.id);
	await prisma.tagPage.deleteMany({
		where: {
			pageId,
			tagId: { notIn: tagIdsToKeep },
		},
	});

	return updatedTags;
}
