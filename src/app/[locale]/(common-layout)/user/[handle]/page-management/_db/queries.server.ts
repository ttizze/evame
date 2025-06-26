import { prisma } from "@/lib/prisma";
import { PageStatus } from "@prisma/client";
export async function fetchPaginatedOwnPages(
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
			in: [PageStatus.PUBLIC, PageStatus.DRAFT],
		},
		pageSegments: {
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
				pageSegments: {
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
		title: page.pageSegments.filter((item) => item.number === 0)[0].text,
	}));
	return {
		pagesWithTitle,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}

export type PageWithTitle = Awaited<
	ReturnType<typeof fetchPaginatedOwnPages>
>["pagesWithTitle"][number];

export async function fetchPageViewCounts(pageIds: number[]) {
	if (pageIds.length === 0) return {} as Record<number, number>;

	const views = await prisma.pageView.findMany({
		where: { pageId: { in: pageIds } },
		select: { pageId: true, count: true },
	});

	return views.reduce(
		(acc, v) => {
			acc[v.pageId] = v.count;
			return acc;
		},
		{} as Record<number, number>,
	);
}
