import { PageStatus } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export const getDbUser = async (userId: number) => {
	return await prisma.user.findUnique({ where: { id: userId } });
};

export async function fetchPaginatedOwnPages(
	userId: number,
	locale: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
) {
	const skip = (page - 1) * pageSize;
	const whereClause = {
		userId,
		status: {
			in: [PageStatus.PUBLIC, PageStatus.DRAFT],
		},
		sourceTexts: {
			some: {
				number: 0,
				text: {
					contains: searchTerm,
					mode: "insensitive" as const,
				},
			},
		},
	};

	const [pages, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: whereClause,
			orderBy: {
				updatedAt: "desc",
			},
			skip,
			take: pageSize,
			select: {
				id: true,
				slug: true,
				updatedAt: true,
				createdAt: true,
				status: true,
				sourceTexts: {
					where: {
						number: 0,
					},
					select: {
						number: true,
						text: true,
					},
				},
			},
		}),
		prisma.page.count({
			where: whereClause,
		}),
	]);

	const pagesWithTitle = pages.map((page) => ({
		...page,
		createdAt: page.createdAt.toLocaleString(locale),
		updatedAt: page.updatedAt.toLocaleString(locale),
		title: page.sourceTexts.filter((item) => item.number === 0)[0].text,
	}));
	return {
		pagesWithTitle,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}
