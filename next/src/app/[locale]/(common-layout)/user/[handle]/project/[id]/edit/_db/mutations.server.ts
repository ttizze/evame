import { prisma } from "@/lib/prisma";

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
