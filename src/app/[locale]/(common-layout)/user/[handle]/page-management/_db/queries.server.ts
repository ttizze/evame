import { sql } from "kysely";
import { db } from "@/db";
import type { Pagestatus } from "@/db/types";

export async function fetchPaginatedOwnPages(
	userId: string,
	locale: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
) {
	const skip = (page - 1) * pageSize;

	// 基本クエリを構築
	let baseQuery = db
		.selectFrom("pages")
		.where("userId", "=", userId)
		.where("status", "in", ["PUBLIC", "DRAFT"] satisfies Pagestatus[]);

	// searchTermがある場合、EXISTS句で該当するセグメントを持つページをフィルタリング
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

	// ページと総数を取得
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

	// タイトルセグメント（number = 0）を取得
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
		.selectFrom("pageViews")
		.select(["pageId", "count"])
		.where("pageId", "in", pageIds)
		.execute();

	return views.reduce(
		(acc, v) => {
			acc[v.pageId] = v.count;
			return acc;
		},
		{} as Record<number, number>,
	);
}
