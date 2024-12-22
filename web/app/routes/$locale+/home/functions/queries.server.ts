import { prisma } from "~/utils/prisma";

export async function fetchPaginatedPublicPages(
	page = 1,
	pageSize = 9,
	currentUserId?: number,
) {
	const skip = (page - 1) * pageSize;
	const [pagesWithInfo, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: {
				isPublished: true,
				isArchived: false,
				sourceTexts: {
					some: {
						number: 0,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			skip,
			take: pageSize,
			select: {
				id: true,
				slug: true,
				title: true,
				isPublished: true,
				createdAt: true,
				user: {
					select: {
						userName: true,
						displayName: true,
						icon: true,
					},
				},
				sourceTexts: {
					where: {
						number: 0,
					},
					select: {
						number: true,
						text: true,
					},
				},
				likePages: {
					where: {
						userId: currentUserId,
					},
					select: {
						userId: true,
					},
				},
				_count: {
					select: {
						likePages: true,
					},
				},
			},
		}),
		prisma.page.count({
			where: {
				isPublished: true,
				isArchived: false,
			},
		}),
	]);

	return {
		pagesWithInfo,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}

export type FetchPaginatedPublicPagesReturn = Awaited<
	ReturnType<typeof fetchPaginatedPublicPages>
>;
