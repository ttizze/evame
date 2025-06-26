import type { Prisma } from "@prisma/client";
import {
	normalizePageSegments,
	selectPagesWithDetails,
} from "@/app/[locale]/_db/page-queries.server";
import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import type { PageSummary } from "@/app/[locale]/types";
import { prisma } from "@/lib/prisma";

export interface FetchPaginatedNewestPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
	currentUserId?: string;
}

/**
 * Fetch paginated public page summaries filtered by given tag name and ordered by newest (createdAt desc).
 */
export async function fetchPaginatedPublicNewestPageSummariesByTag({
	tagName,
	page = 1,
	pageSize = 5,
	locale = "en",
	currentUserId,
}: FetchPaginatedNewestPagesByTagParams): Promise<{
	pageSummaries: PageSummary[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	const baseWhere: Prisma.PageWhereInput = {
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
		{ createdAt: "desc" },
	];

	const select = selectPagesWithDetails(true, locale, currentUserId);

	const [rawPages, total] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select,
		}),
		prisma.page.count({ where: baseWhere }),
	]);

	const pages = rawPages.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			p.id,
			normalizePageSegments(p.pageSegments),
		),
	}));

	return {
		pageSummaries: pages,
		totalPages: Math.ceil(total / pageSize),
	};
}
