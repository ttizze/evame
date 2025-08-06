import type { Prisma } from "@prisma/client";
import { fetchPagesWithTransform } from "@/app/[locale]/_db/page-list-queries.server";
import type { PageForList } from "@/app/[locale]/types";

export interface FetchPaginatedPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
}

/**
 * Fetch paginated public page summaries filtered by given tag name and ordered by popularity.
 */
export async function fetchPaginatedPublicPageListsByTag({
	tagName,
	page = 1,
	pageSize = 5,
	locale = "en",
}: FetchPaginatedPagesByTagParams): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	const where: Prisma.PageWhereInput = {
		status: "PUBLIC",
		tagPages: {
			some: {
				tag: {
					name: tagName,
				},
			},
		},
	};

	const orderBy: Prisma.PageOrderByWithRelationInput[] = [
		{ likePages: { _count: "desc" } },
		{ createdAt: "desc" },
	];

	const { pageForLists, total } = await fetchPagesWithTransform(
		where,
		skip,
		pageSize,
		locale,
		orderBy,
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}
