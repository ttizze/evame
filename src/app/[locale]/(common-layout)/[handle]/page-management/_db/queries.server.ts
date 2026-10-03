import { sql } from "kysely";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";

export type PageWithTitle = {
	id: number;
	slug: string;
	updatedAt: string;
	createdAt: string;
	status: PageStatus;
	title: string;
};

export type PaginatedOwnPages = {
	pagesWithTitle: PageWithTitle[];
	totalPages: number;
	currentPage: number;
};

export async function fetchPaginatedOwnPages(
	userId: string,
	locale: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
): Promise<PaginatedOwnPages> {
	const skip = (page - 1) * pageSize;

	let baseQuery = db
		.selectFrom("pages")
		.where("userId", "=", userId)
		.where("status", "in", ["PUBLIC", "DRAFT"] satisfies PageStatus[]);

	if (searchTerm) {
		baseQuery = baseQuery.where((eb) =>
			eb.exists(
				eb
					.selectFrom("segments")
					.select(sql`1`.as("one"))
					.whereRef("segments.contentId", "=", "pages.id")
					.where("segments.number", "=", 0)
					.where("segments.text", "ilike", `%${searchTerm}%`),
			),
		);
	}

	const [rawPages, totalCountResult] = await Promise.all([
		baseQuery
			.select(["id", "slug", "updatedAt", "createdAt", "status"])
			.orderBy("updatedAt", "desc")
			.limit(pageSize)
			.offset(skip)
			.execute(),
		baseQuery.select(sql<number>`count(*)::int`.as("count")).executeTakeFirst(),
	]);

	const totalCount = Number(totalCountResult?.count ?? 0);
	const titleSegments =
		rawPages.length > 0
			? await db
					.selectFrom("segments")
					.select(["contentId", "text"])
					.where(
						"contentId",
						"in",
						rawPages.map((p) => p.id),
					)
					.where("number", "=", 0)
					.execute()
			: [];

	const segmentMap = new Map(
		titleSegments.map((segment) => [segment.contentId, segment.text]),
	);
	const pagesWithTitle = rawPages.map((pageData) => {
		const title = segmentMap.get(pageData.id);
		if (!title) {
			throw new Error(
				`Page ${pageData.id} (slug: ${pageData.slug}) is missing required title segment (number: 0). This indicates data corruption.`,
			);
		}

		return {
			...pageData,
			createdAt: pageData.createdAt.toLocaleString(locale),
			updatedAt: pageData.updatedAt.toLocaleString(locale),
			title,
		};
	});

	return {
		pagesWithTitle,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}

export async function fetchPageViewCounts(pageIds: number[]) {
	if (pageIds.length === 0) return {} as Record<number, number>;

	const views = await db
		.selectFrom("pageViews")
		.select(["pageId", "count"])
		.where("pageId", "in", pageIds)
		.execute();

	return views.reduce(
		(acc, view) => {
			acc[view.pageId] = view.count;
			return acc;
		},
		{} as Record<number, number>,
	);
}
