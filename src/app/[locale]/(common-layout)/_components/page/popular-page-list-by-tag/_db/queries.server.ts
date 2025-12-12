import { searchPageIdsByTagName } from "@/app/[locale]/_db/page-list-helpers.server";
import { fetchPagesWithTransform } from "@/app/[locale]/_db/page-list-queries.server";
import type { PageOrderByInput } from "@/app/[locale]/_db/types";
import type { PageForList } from "@/app/[locale]/types";

export interface FetchPaginatedPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
}

/**
 * Fetch paginated public page summaries filtered by given tag name and ordered by popularity.
 * Drizzle版に移行済み
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

	// 1. 該当するページIDを取得（全件取得）
	const allPageIds = await searchPageIdsByTagName(tagName, {
		status: "PUBLIC",
	});

	const total = allPageIds.length;

	if (total === 0) {
		return { pageForLists: [], totalPages: 0 };
	}

	// 2. ページ情報を取得（人気順でソート）
	// 注意: 全てのページを取得してから、JavaScriptでページネーションを行う
	// これは、人気順でソートするために必要な処理
	const orderBy: PageOrderByInput[] = [
		{ likePages: { _count: "desc" } },
		{ createdAt: "desc" },
	];

	const { pageForLists: allPageForLists } = await fetchPagesWithTransform(
		{
			id: { in: allPageIds },
			status: "PUBLIC",
		},
		0,
		allPageIds.length, // 全件取得
		locale,
		orderBy,
	);

	// 3. ページネーション（既にソート済みなので、sliceで取得）
	const pageForLists = allPageForLists.slice(skip, skip + pageSize);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}
