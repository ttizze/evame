import type { Prisma } from "@prisma/client";
import { ContentKind } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_lib/sync-segments";
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

	await syncSegments(prisma, page.id, p.segments);
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
