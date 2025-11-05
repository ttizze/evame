import type { Prisma } from "@prisma/client";
import { ContentKind } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { prisma } from "@/lib/prisma";
import { syncSegments } from "@/lib/sync-segments";

export async function upsertPageAndSegments(p: {
	pageId: number | undefined;
	pageSlug: string;
	userId: string;
	title: string;
	mdastJson: Prisma.InputJsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
}) {
	await prisma.$transaction(async (tx) => {
		// 既存ページを確認
		const existingPage = await tx.page.findFirst({
			where: { slug: p.pageSlug, userId: p.userId },
		});

		const page = existingPage
			? await tx.page.update({
					where: { id: existingPage.id },
					data: {
						mdastJson: p.mdastJson,
						sourceLocale: p.sourceLocale,
					},
				})
			: await tx.page.create({
					data: {
						slug: p.pageSlug,
						userId: p.userId,
						mdastJson: p.mdastJson,
						sourceLocale: p.sourceLocale,
						id: (await tx.content.create({ data: { kind: ContentKind.PAGE } }))
							.id,
					},
				});

		await syncSegments(tx, page.id, p.segments);
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
