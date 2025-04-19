import type { BlockWithNumber } from "@/app/[locale]/_lib/process-html";
import { syncSegmentsChunk } from "@/app/[locale]/_lib/sync-segments-chunk";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import { BATCH_SIZE, OFFSET } from "@/app/_constants/sync-segments";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
export async function updateProjectWithHtml(
	projectId: string,
	description: string,
	userId: string,
) {
	return await prisma.project.update({
		where: { id: projectId, userId },
		data: { description },
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

export async function syncProjectSegments(
	projectId: string,
	blocks: readonly BlockWithNumber[],
): Promise<void> {
	const hashes = blocks.map((b) => b.textAndOccurrenceHash);

	await prisma.$transaction(async (tx) => {
		await tx.projectSegment.updateMany({
			where: { projectId },
			data: { number: { increment: OFFSET } },
		});

		await tx.projectSegment.deleteMany({
			where: { projectId, textAndOccurrenceHash: { notIn: hashes } },
		});

		for (const batch of syncSegmentsChunk(blocks, BATCH_SIZE)) {
			await Promise.all(
				batch.map((b) =>
					tx.projectSegment.upsert({
						where: {
							projectId_textAndOccurrenceHash: {
								projectId,
								textAndOccurrenceHash: b.textAndOccurrenceHash,
							},
						},
						update: { text: b.text, number: b.number },
						create: {
							projectId,
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
