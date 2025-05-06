import { prisma } from "@/lib/prisma";
import { LifecycleStatus } from "@prisma/client";
export async function fetchPaginatedOwnProjects(
	userId: string,
	locale: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
) {
	const skip = (page - 1) * pageSize;
	const whereClause = {
		userId,
		status: {
			in: [LifecycleStatus.PUBLIC, LifecycleStatus.DRAFT],
		},
	};

	const [projects, totalCount] = await Promise.all([
		prisma.project.findMany({
			where: whereClause,
			orderBy: {
				updatedAt: "desc",
			},
			skip,
			take: pageSize,
			select: {
				id: true,
				slug: true,
				title: true,
				updatedAt: true,
				createdAt: true,
				status: true,
			},
		}),
		prisma.project.count({
			where: whereClause,
		}),
	]);

	return {
		projects,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}

export type ProjectWithTitle = Awaited<
	ReturnType<typeof fetchPaginatedOwnProjects>
>["projects"][number];
