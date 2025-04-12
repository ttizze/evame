import { prisma } from "@/lib/prisma";

export interface PopularTag {
	id: number;
	name: string;
	_count: {
		pages: number;
	};
}

/**
 * Fetches popular tags based on usage count
 * @param limit Maximum number of tags to return
 * @returns Array of popular tags with usage count
 */
export async function fetchPopularTags(limit: number): Promise<PopularTag[]> {
	return prisma.tag.findMany({
		take: limit,
		orderBy: {
			pages: {
				_count: "desc",
			},
		},
		select: {
			id: true,
			name: true,
			_count: {
				select: {
					pages: true,
				},
			},
		},
	});
}
