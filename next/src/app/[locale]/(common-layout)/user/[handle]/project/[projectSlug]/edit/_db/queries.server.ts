import { prisma } from "@/lib/prisma";

export interface ProjectTagWithCount {
	id: number;
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
