import type { BlockWithNumber } from "@/app/[locale]/_lib/process-html";
import { syncSegmentsChunk } from "@/app/[locale]/_lib/sync-segments-chunk";
import { BATCH_SIZE, OFFSET } from "@/app/_constants/sync-segments";
import { prisma } from "@/lib/prisma";

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
