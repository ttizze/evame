import type { BlockWithNumber } from "@/app/[locale]/_lib/process-html";
import { syncSegmentsChunk } from "@/app/[locale]/_lib/sync-segments-chunk";
import { BATCH_SIZE, OFFSET } from "@/app/_constants/sync-segments";
import { prisma } from "@/lib/prisma";
export async function upsertPageWithHtml({
	pageId,
	slug,
	html,
	userId,
	sourceLocale,
}: {
	pageId: number;
	slug: string;
	html: string;
	userId: string;
	sourceLocale: string;
}) {
	return await prisma.page.upsert({
		where: { id: pageId, userId },
		update: {
			content: html,
			sourceLocale,
		},
		create: {
			slug,
			content: html,
			userId,
			sourceLocale,
		},
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

export async function syncPageSegments(
	pageId: number,
	blocks: readonly BlockWithNumber[],
) {
	const hashes = blocks.map((b) => b.textAndOccurrenceHash);

	await prisma.$transaction(async (tx) => {
		/* 1) 並び順を一気に避難 */
		await tx.pageSegment.updateMany({
			where: { pageId },
			data: { number: { increment: OFFSET } },
		});

		/* 2) 消えた行を削除 */
		await tx.pageSegment.deleteMany({
			where: { pageId, textAndOccurrenceHash: { notIn: hashes } },
		});

		/* 3) 残す／新規行はハッシュで Upsert */
		for (const batch of syncSegmentsChunk(blocks, BATCH_SIZE)) {
			await Promise.all(
				batch.map((b) =>
					tx.pageSegment.upsert({
						where: {
							pageId_textAndOccurrenceHash: {
								pageId,
								textAndOccurrenceHash: b.textAndOccurrenceHash,
							},
						},
						update: { text: b.text, number: b.number },
						create: {
							pageId,
							textAndOccurrenceHash: b.textAndOccurrenceHash,
							text: b.text,
							number: b.number,
						},
					}),
				),
			);
		}
	});
}
