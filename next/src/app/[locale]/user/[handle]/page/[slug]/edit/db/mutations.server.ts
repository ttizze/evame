import type { BlockWithNumber } from "@/app/[locale]/lib/process-html";
import { prisma } from "@/lib/prisma";
import type { PageStatus } from "@prisma/client";

export async function upsertPageWithHtml(
	pageSlug: string,
	html: string,
	userId: string,
	sourceLocale: string,
) {
	return await prisma.page.upsert({
		where: { slug: pageSlug },
		update: {
			content: html,
			sourceLocale,
		},
		create: {
			slug: pageSlug,
			content: html,
			userId,
			sourceLocale,
		},
	});
}

export async function updatePageStatus(pageId: number, status: PageStatus) {
	return await prisma.page.update({
		where: { id: pageId },
		data: { status },
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

export async function synchronizePagePageSegments(
	pageId: number,
	blocks: BlockWithNumber[],
): Promise<Map<string, number>> {
	const BATCH_SIZE = 1000;
	const OFFSET = 1_000_000;

	// 1. 既存のテキスト取得
	const existingPageSegments = await prisma.pageSegment.findMany({
		where: { pageId },
		select: { id: true, textAndOccurrenceHash: true, number: true },
	});

	const hashToId = new Map<string, number>(
		existingPageSegments.map((t) => [t.textAndOccurrenceHash as string, t.id]),
	);
	const newHashes = new Set(blocks.map((t) => t.textAndOccurrenceHash));

	// 不要テキストID特定
	const hashesToDelete = existingPageSegments
		.filter((t) => !newHashes.has(t.textAndOccurrenceHash as string))
		.map((t) => t.id);

	// (トランザクション1)
	await prisma.$transaction(
		async (tx) => {
			// 不要テキスト削除
			if (hashesToDelete.length > 0) {
				await tx.pageSegment.deleteMany({
					where: {
						pageId,
						id: { in: hashesToDelete },
					},
				});
			}

			// 既存テキストオフセット
			const existingIds = existingPageSegments.map((t) => t.id);
			if (existingIds.length > 0) {
				await tx.pageSegment.updateMany({
					where: {
						pageId,
						id: { in: existingIds },
					},
					data: { number: { increment: OFFSET } },
				});
			}
		},
		{
			maxWait: 50000,
			timeout: 100000,
		},
	);
	// トランザクション1終了

	// 2. 既存テキストのnumberを更新
	// 4. 既存テキストのnumberを直列で更新
	const updates = blocks.filter((t) => hashToId.has(t.textAndOccurrenceHash));

	// バッチサイズで分けて並列処理（トランザクションなし）
	for (let i = 0; i < updates.length; i += BATCH_SIZE) {
		const batch = updates.slice(i, i + BATCH_SIZE);
		// Promise.allで並列実行
		await Promise.all(
			batch.map((t) => {
				const id = hashToId.get(t.textAndOccurrenceHash);
				if (id === undefined) {
					throw new Error(`No ID found for hash: ${t.textAndOccurrenceHash}`);
				}
				return prisma.pageSegment.update({
					where: { pageId, id },
					data: { number: t.number },
				});
			}),
		);
	}

	// 3. 新規テキスト挿入
	const newInserts = blocks
		.filter((t) => !hashToId.has(t.textAndOccurrenceHash))
		.map((t) => ({
			pageId,
			textAndOccurrenceHash: t.textAndOccurrenceHash,
			text: t.text,
			number: t.number,
		}));

	if (newInserts.length > 0) {
		// (トランザクション3)
		await prisma.$transaction(
			async (tx) => {
				for (let i = 0; i < newInserts.length; i += BATCH_SIZE) {
					const batch = newInserts.slice(i, i + BATCH_SIZE);
					await tx.pageSegment.createMany({
						data: batch,
						skipDuplicates: true,
					});
				}
			},
			{
				maxWait: 50000,
				timeout: 100000,
			},
		);
		// トランザクション3終了

		// 挿入後のID再取得 (トランザクション外でも可)
		const insertedPageSegments = await prisma.pageSegment.findMany({
			where: {
				pageId,
				textAndOccurrenceHash: {
					in: newInserts.map((insert) => insert.textAndOccurrenceHash),
				},
			},
			select: { textAndOccurrenceHash: true, id: true },
		});

		for (const pageSegment of insertedPageSegments) {
			if (pageSegment.textAndOccurrenceHash) {
				hashToId.set(pageSegment.textAndOccurrenceHash, pageSegment.id);
			}
		}
	}

	return hashToId;
}
