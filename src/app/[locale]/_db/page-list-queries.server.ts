import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSegmentBundles } from "../_lib/to-segment-bundles";
import { transformPageSegments } from "../_lib/transform-page-segments";
import type { PageForList, PageForTitle } from "../types";
import { selectUserFields } from "./queries.server";

export const selectPageFields = (locale = "en") => ({
	id: true,
	slug: true,
	createdAt: true,
	status: true,
	sourceLocale: true,
	parentId: true,
	order: true,
	user: {
		select: selectUserFields(),
	},
	pageSegments: {
		where: { number: 0 }, // タイトルのみ取得
		select: {
			id: true,
			number: true,
			text: true,
			pageSegmentTranslations: {
				where: { locale, isArchived: false },
				orderBy: [
					{ point: Prisma.SortOrder.desc },
					{ createdAt: Prisma.SortOrder.desc },
				],
				take: 1,
				select: {
					id: true,
					locale: true,
					text: true,
					point: true,
					createdAt: true,
					user: {
						select: selectUserFields(),
					},
				},
			},
		},
	},
});

const selectPageListFields = (locale = "en") => ({
	...selectPageFields(locale),
	tagPages: {
		include: {
			tag: true,
		},
	},
	_count: {
		select: {
			pageComments: true,
		},
	},
});

const selectForTitleAndChildrenFields = (locale = "en") => ({
	...selectPageFields(locale),
	_count: {
		select: {
			children: true,
		},
	},
});

type FetchListParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	locale?: string;
};

// 共通のページ取得・変換関数
export async function fetchPagesWithTransform(
	where: Prisma.PageWhereInput,
	skip: number,
	take: number,
	locale: string,
	orderBy?:
		| Prisma.PageOrderByWithRelationInput
		| Prisma.PageOrderByWithRelationInput[],
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const select = selectPageListFields(locale);
	const [rawPages, total] = await Promise.all([
		prisma.page.findMany({
			where,
			skip,
			take,
			select,
			orderBy,
		}),
		prisma.page.count({ where }),
	]);

	const pages = rawPages.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			p.id,
			transformPageSegments(p.pageSegments),
		),
	}));

	return {
		pageForLists: pages,
		total,
	};
}

async function fetchPaginatedPublicPageListsWithOrderBy({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	locale = "en",
	orderBy,
}: FetchListParams & {
	orderBy:
		| Prisma.PageOrderByWithRelationInput
		| Prisma.PageOrderByWithRelationInput[];
}): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: Prisma.PageWhereInput = {
		status: "PUBLIC",
		parentId: null, // 親ページのみ表示（子ページは除外）
	};

	// 所有者のみ表示したい場合
	if (pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	const { pageForLists, total } = await fetchPagesWithTransform(
		baseWhere,
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

export async function fetchPaginatedNewPageLists(params: FetchListParams) {
	return fetchPaginatedPublicPageListsWithOrderBy({
		...params,
		orderBy: { createdAt: Prisma.SortOrder.desc },
	});
}

export async function fetchPaginatedPopularPageLists(params: FetchListParams) {
	return fetchPaginatedPublicPageListsWithOrderBy({
		...params,
		orderBy: [
			{ likePages: { _count: Prisma.SortOrder.desc } },
			{ createdAt: Prisma.SortOrder.desc },
		],
	});
}

export async function fetchChildPages(
	parentId: number,
	locale: string,
): Promise<PageForTitle[]> {
	const raws = await prisma.page.findMany({
		where: { parentId, status: "PUBLIC" },
		orderBy: { order: "asc" },
		select: selectForTitleAndChildrenFields(locale),
	});
	return raws.map((raw) => ({
		...raw,
		createdAt: raw.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			raw.id,
			transformPageSegments(raw.pageSegments),
		),
		children: [],
	})) as PageForTitle[];
}

// ==================== 検索用関数 ====================

export async function searchPagesByTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const where: Prisma.PageWhereInput = {
		status: "PUBLIC",
		pageSegments: {
			some: {
				text: { contains: query, mode: "insensitive" },
				number: 0,
			},
		},
	};

	return fetchPagesWithTransform(where, skip, take, locale);
}

export async function searchPagesByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
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

	return fetchPagesWithTransform(where, skip, take, locale);
}

export async function searchPagesByContent(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	/* 1. ヒットした pageId を一括取得 (distinct) ------------------------ */
	const matchedIds = await prisma.pageSegment.findMany({
		where: {
			text: { contains: query, mode: "insensitive" },
			page: { status: "PUBLIC" }, // ページ公開フラグ
		},
		select: { pageId: true },
		distinct: ["pageId"], // ← pageId ごとに 1 行
	});

	/* 2. ページネーションを自前で行う ---------------------------------- */
	const pageIds = matchedIds.map((row) => row.pageId).slice(skip, skip + take);

	/* 3. 合計件数 (= DISTINCT pageId) を取得 --------------------------- */
	const total = matchedIds.length;

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	/* 4. page と関連情報をフェッチ ------------------------------------ */
	const where: Prisma.PageWhereInput = {
		id: { in: pageIds },
		status: "PUBLIC",
	};

	return fetchPagesWithTransform(where, 0, pageIds.length, locale);
}
