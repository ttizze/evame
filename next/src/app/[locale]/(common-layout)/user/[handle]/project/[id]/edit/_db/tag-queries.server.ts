import { prisma } from "@/lib/prisma";

export interface ProjectTagWithCount {
	id: string;
	name: string;
	_count: {
		projectTagRelations: number;
	};
}

/**
 * Fetch all project tags with their usage count
 */
export async function fetchAllProjectTags(): Promise<ProjectTagWithCount[]> {
	return prisma.projectTag.findMany({
		include: {
			_count: {
				select: {
					projectTagRelations: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});
}

/**
 * Upsert project tags for a project
 */
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
