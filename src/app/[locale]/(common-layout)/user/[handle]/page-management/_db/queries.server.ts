import { and, count, desc, eq, exists, ilike, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, pageViews, segments } from "@/drizzle/schema";
import type { PageStatus } from "@/drizzle/types";

export async function fetchPaginatedOwnPages(
	userId: string,
	locale: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
) {
	const skip = (page - 1) * pageSize;

	// WHERE条件の構築
	const conditions = [
		eq(pages.userId, userId),
		inArray(pages.status, ["PUBLIC", "DRAFT"] satisfies PageStatus[]),
	];

	// searchTermがある場合、EXISTS句で該当するセグメントを持つページをフィルタリング
	if (searchTerm) {
		conditions.push(
			exists(
				db
					.select()
					.from(segments)
					.where(
						and(
							eq(segments.contentId, pages.id),
							eq(segments.number, 0),
							ilike(segments.text, `%${searchTerm}%`),
						),
					),
			),
		);
	}

	const whereClause = and(...conditions);

	// ページと総数を取得
	const [rawPages, totalCountResult] = await Promise.all([
		db
			.select({
				id: pages.id,
				slug: pages.slug,
				updatedAt: pages.updatedAt,
				createdAt: pages.createdAt,
				status: pages.status,
			})
			.from(pages)
			.where(whereClause)
			.orderBy(desc(pages.updatedAt))
			.limit(pageSize)
			.offset(skip),
		db.select({ count: count() }).from(pages).where(whereClause),
	]);

	const totalCount = Number(totalCountResult[0]?.count ?? 0);

	// タイトルセグメント（number = 0）を取得
	const titleSegments =
		rawPages.length > 0
			? await db
					.select({
						contentId: segments.contentId,
						text: segments.text,
					})
					.from(segments)
					.where(
						and(
							inArray(
								segments.contentId,
								rawPages.map((p) => p.id),
							),
							eq(segments.number, 0),
						),
					)
			: [];

	// セグメントをマップに変換
	const segmentMap = new Map(titleSegments.map((s) => [s.contentId, s.text]));

	const pagesWithTitle = rawPages.map((page) => {
		const title = segmentMap.get(page.id);

		if (!title) {
			throw new Error(
				`Page ${page.id} (slug: ${page.slug}) is missing required title segment (number: 0). This indicates data corruption.`,
			);
		}

		return {
			...page,
			createdAt: page.createdAt.toLocaleString(locale),
			updatedAt: page.updatedAt.toLocaleString(locale),
			title,
		};
	});

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

	const views = await db
		.select({
			pageId: pageViews.pageId,
			count: pageViews.count,
		})
		.from(pageViews)
		.where(inArray(pageViews.pageId, pageIds));

	return views.reduce(
		(acc, v) => {
			acc[v.pageId] = v.count;
			return acc;
		},
		{} as Record<number, number>,
	);
}
