import { uploadImage } from "@/app/[locale]/_lib/upload";
import { prisma } from "@/lib/prisma";

import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import type { Prisma, Project } from "@prisma/client";
import { z } from "zod";

export async function upsertProjectAndSegments(p: {
	projectId?: number;
	userId: string;
	slug: string;
	title: string;
	tagLine: string;
	mdastJson: Prisma.InputJsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
}) {
	let project: Project;
	if (!p.projectId) {
		project = await prisma.project.create({
			data: {
				userId: p.userId,
				slug: p.slug,
				title: p.title,
				mdastJson: p.mdastJson,
				sourceLocale: p.sourceLocale,
			},
		});
	} else {
		project = await prisma.project.update({
			where: { id: p.projectId, userId: p.userId },
			data: {
				title: p.title,
				mdastJson: p.mdastJson,
				sourceLocale: p.sourceLocale,
			},
		});
	}

	await syncProjectSegments(project.id, p.segments);
	return project;
}

/** 1ページ分のセグメントを同期 */
async function syncProjectSegments(projectId: number, drafts: SegmentDraft[]) {
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
						update: { text: d.text, number: d.number },
						create: {
							projectId,
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
			await tx.projectSegment.deleteMany({
				where: { projectId, textAndOccurrenceHash: { in: [...stale] } },
			});
		}
	});
}

export async function upsertProjectTags(tagNames: string[], projectId: number) {
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
	id: z.number().optional(),
	url: z.string().url({ message: "Please enter a valid URL." }),
	description: z
		.string()
		.max(50, { message: "Description must not exceed 50 characters." }),
});

export const imageSchema = z.object({
	id: z.number().optional(),
	url: z.string(),
	caption: z
		.string()
		.max(200, { message: "Caption must not exceed 200 characters." }),
	order: z.number().int().min(0),
});

export const iconSchema = z
	.object({ id: z.number().optional(), url: z.string() })
	.optional();

export async function upsertLinksTx(
	projectId: number,
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
	projectId: number,
	images: z.infer<typeof imageSchema>[],
	protectedIconId?: number,
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
	projectId: number,
	icon: z.infer<typeof iconSchema> | undefined,
	iconFile: File | undefined,
	iconFileName: string | undefined,
) {
	let iconId: number | null = null;
	if (iconFile && iconFileName) {
		const result = await uploadImage(iconFile);
		if (!result.success)
			throw new Error(result.message || "Icon upload failed");
		const { imageUrl } = result.data;
		const created = await prisma.projectImage.create({
			data: { url: imageUrl, caption: "", order: 0, projectId },
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
