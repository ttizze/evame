import type { Prisma } from "@prisma/client";
import { ContentKind } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { prisma } from "@/lib/prisma";

export async function upsertPageAndSegments(p: {
	pageId: number | undefined;
	pageSlug: string;
	userId: string;
	title: string;
	mdastJson: Prisma.InputJsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
}) {
	const page = await prisma.$transaction(async (tx) => {
		// 既存ページを確認
		const existingPage = await tx.page.findFirst({
			where: { slug: p.pageSlug, userId: p.userId },
		});

		if (existingPage) {
			// 既存ページを更新
			return await tx.page.update({
				where: { id: existingPage.id },
				data: {
					mdastJson: p.mdastJson,
					sourceLocale: p.sourceLocale,
				},
			});
		} else {
			// 新しいコンテンツを作成
			const content = await tx.content.create({
				data: {
					kind: ContentKind.PAGE,
				},
			});

			// 新しいページを作成
			return await tx.page.create({
				data: {
					slug: p.pageSlug,
					userId: p.userId,
					mdastJson: p.mdastJson,
					sourceLocale: p.sourceLocale,
					id: content.id,
				},
			});
		}
	});

	await syncPageSegments(page.id, p.segments);
}

/** 1ページ分のセグメントを同期 */
async function syncPageSegments(pageId: number, drafts: SegmentDraft[]) {
	// ページに関連するContentを取得
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		select: { id: true },
	});

	if (!page?.id) {
		throw new Error(`Page ${pageId} does not have a content`);
	}

	const existing = await prisma.segment.findMany({
		where: { contentId: page.id },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.segment.updateMany({
				where: { contentId: page.id },
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
								contentId: page.id,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.number },
						create: {
							contentId: page.id,
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
					contentId: page.id,
					textAndOccurrenceHash: { in: [...stale] },
				},
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
