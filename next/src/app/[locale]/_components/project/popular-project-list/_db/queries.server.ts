import { prisma } from "@/lib/prisma";

export async function fetchPopularProjectsWithPagination(
	page = 1,
	pageSize = 10,
	searchTerm = "",
) {
	const skip = (page - 1) * pageSize;
	const whereClause = {
		OR: [
			{
				title: {
					contains: searchTerm,
					mode: "insensitive" as const,
				},
			},
			{
				description: {
					contains: searchTerm,
					mode: "insensitive" as const,
				},
			},
		],
	};

	const [projectsWithRelations, totalCount] = await Promise.all([
		prisma.project.findMany({
			where: whereClause,
			orderBy: {
				updatedAt: "desc",
			},
			skip,
			take: pageSize,
			include: {
				user: true,
				images: true,
				links: true,
				projectTagRelations: { include: { projectTag: true } },
			},
		}),
		prisma.project.count({
			where: whereClause,
		}),
	]);

	return {
		projectsWithRelations,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}
