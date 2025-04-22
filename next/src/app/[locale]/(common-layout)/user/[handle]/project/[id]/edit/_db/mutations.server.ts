import type { SegmentDraft } from "@/app/[locale]/_lib/collect-segments";
import { collectSegments } from "@/app/[locale]/_lib/collect-segments";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import type { AstNode } from "@/app/types/ast-node";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
/* lib/page-upsert.ts */
export async function upsertProjectAndSegments(p: {
	projectId: string;
	userId: string;
	title: string;
	tagLine: string;
	descriptionJson: AstNode;
	sourceLocale: string;
}) {
	const { segments, jsonWithHash } = collectSegments({
		root: p.descriptionJson,
		header: p.tagLine,
	});

	const project = await prisma.project.upsert({
		where: { id: p.projectId, userId: p.userId },
		update: { descriptionJson: jsonWithHash as Prisma.InputJsonValue },
		create: {
			title: p.title,
			userId: p.userId,
			description: "test",
			descriptionJson: jsonWithHash as Prisma.InputJsonValue,
			sourceLocale: p.sourceLocale,
		},
	});

	await syncProjectSegments(project.id, segments);
}

/** 1ページ分のセグメントを同期 */
export async function syncProjectSegments(
	projectId: string,
	drafts: SegmentDraft[],
) {
	const existing = await prisma.projectSegment.findMany({
		where: { projectId },
		select: { textAndOccurrenceHash: true },
	});
	const stale = new Set(existing.map((e) => e.textAndOccurrenceHash as string));

	await prisma.$transaction(async (tx) => {
		// A. 並び避難（既存あれば）
		if (existing.length) {
			await tx.projectSegment.updateMany({
				where: { projectId },
				data: { number: { increment: 1_000_000 } },
			});
		}

		// B. UPSERT を **適度なバッチ & 逐次 await** で安定
		const CHUNK = 200;
		for (let i = 0; i < drafts.length; i += CHUNK) {
			const chunk = drafts.slice(i, i + CHUNK);
			await Promise.all(
				chunk.map((d) =>
					tx.projectSegment.upsert({
						where: {
							projectId_textAndOccurrenceHash: {
								projectId,
								textAndOccurrenceHash: d.hash,
							},
						},
						update: { text: d.text, number: d.order },
						create: {
							projectId,
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
			await tx.projectSegment.deleteMany({
				where: { projectId, textAndOccurrenceHash: { in: [...stale] } },
			});
		}
	});
}

export async function upsertProjectTags(tagNames: string[], projectId: string) {
	// Remove duplicates
	const uniqueTags = Array.from(new Set(tagNames));

	const upsertPromises = uniqueTags.map(async (tagName) => {
		const upsertedTag = await prisma.projectTag.upsert({
			where: { name: tagName },
			update: {},
			create: { name: tagName },
		});

		await prisma.projectTagRelation.upsert({
			where: {
				projectId_projectTagId: {
					projectId: projectId,
					projectTagId: upsertedTag.id,
				},
			},
			update: {},
			create: {
				projectId: projectId,
				projectTagId: upsertedTag.id,
			},
		});

		return upsertedTag;
	});

	const updatedTags = await Promise.all(upsertPromises);

	// Delete any tag relations that are not in the updated list
	const tagIdsToKeep = updatedTags.map((tag) => tag.id);
	await prisma.projectTagRelation.deleteMany({
		where: {
			projectId,
			projectTagId: { notIn: tagIdsToKeep },
		},
	});

	return updatedTags;
}

export const linkSchema = z.object({
	id: z.string().optional(),
	url: z.string().url({ message: "Please enter a valid URL." }),
	description: z
		.string()
		.max(50, { message: "Description must not exceed 50 characters." }),
});

export const imageSchema = z.object({
	id: z.string().optional(),
	url: z.string(),
	caption: z
		.string()
		.max(200, { message: "Caption must not exceed 200 characters." }),
	order: z.number().int().min(0),
});

export const iconSchema = z
	.object({ id: z.string().optional(), url: z.string() })
	.optional();

export async function upsertLinksTx(
	projectId: string,
	links: z.infer<typeof linkSchema>[],
) {
	const ids = links
		.filter((l): l is { id: string } & typeof l => !!l.id)
		.map((l) => l.id);
	await prisma.projectLink.deleteMany({
		where: { projectId, id: { notIn: ids } },
	});
	await Promise.all(
		links.map((l) =>
			l.id
				? prisma.projectLink.update({
						where: { id: l.id },
						data: { url: l.url, description: l.description },
					})
				: prisma.projectLink.create({ data: { ...l, projectId } }),
		),
	);
}

export async function upsertImagesTx(
	projectId: string,
	images: z.infer<typeof imageSchema>[],
	protectedIconId?: string,
) {
	const keepIds = images
		.filter((img): img is { id: string } & typeof img => !!img.id)
		.map((img) => img.id);
	const deleteWhere: Prisma.ProjectImageWhereInput = {
		projectId,
		AND: [
			{ id: { notIn: keepIds } }, // ギャラリーに含まれない
			protectedIconId // アイコンは守る
				? { id: { not: protectedIconId } }
				: {},
		],
	};

	await prisma.projectImage.deleteMany({ where: deleteWhere });

	await Promise.all(
		images.map((img) =>
			img.id
				? prisma.projectImage.update({
						where: { id: img.id },
						data: { url: img.url, caption: img.caption, order: img.order },
					})
				: prisma.projectImage.create({
						data: { ...img, projectId },
					}),
		),
	);
}

export async function upsertIconTx(
	projectId: string,
	icon: z.infer<typeof iconSchema> | undefined,
	iconFile: File | null,
	iconFileName: string | null,
) {
	let iconId: string | null = null;
	if (iconFile && iconFileName) {
		const { success, data, message } = await uploadImage(iconFile);
		if (!success || !data?.imageUrl)
			throw new Error(message || "Icon upload failed");
		const created = await prisma.projectImage.create({
			data: { url: data.imageUrl, caption: "", order: 0, projectId },
		});
		iconId = created.id;
	} else if (icon?.id) {
		iconId = icon.id;
	}
	await prisma.project.update({
		where: { id: projectId },
		data: { iconImageId: iconId },
	});
}
