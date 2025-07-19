import { Prisma } from "@prisma/client";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { toSegmentBundles } from "../_lib/to-segment-bundles";
import type { PageDetail, PageSummary } from "../types";
import { selectUserFields } from "./queries.server";

const selectPageRelatedFields = (
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) => {
	return {
		user: {
			select: selectUserFields(),
		},
		tagPages: {
			include: {
				tag: true,
			},
		},
		pageSegments: {
			where: onlyTitle ? { number: 0 } : undefined,
			include: {
				pageSegmentTranslations: {
					where: { locale, isArchived: false },
					include: {
						user: {
							select: selectUserFields(),
						},
						...(currentUserId && {
							votes: {
								where: { userId: currentUserId },
							},
						}),
					},
					orderBy: [
						{ point: Prisma.SortOrder.desc },
						{ createdAt: Prisma.SortOrder.desc },
					],
				},
			},
		},
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
};

export const selectPagesWithDetails = (
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) => {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		sourceLocale: true,
		parentId: true,
		order: true,
		...selectPageRelatedFields(onlyTitle, locale, currentUserId),
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
};

type FetchParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	isPopular?: boolean;
	locale?: string;
	currentUserId?: string;
};

export function normalizePageSegments(
	pageSegments: {
		id: number;
		number: number;
		text: string;
		pageSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			votes?: { isUpvote: boolean; updatedAt: Date }[];
		}[];
	}[],
) {
	return pageSegments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		segmentTranslations: seg.pageSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.votes?.[0] ?? null,
		})),
	}));
}

export async function fetchPageDetail(
	slug: string,
	locale: string,
	currentUserId?: string,
): Promise<PageDetail | null> {
	// 1. ルートページを取得（slug は一意なので findUnique）
	const page = await prisma.page.findUnique({
		where: { slug },
		include: {
			...selectPageRelatedFields(false, locale, currentUserId),
		},
	});

	if (!page) return null;

	const normalized = normalizePageSegments(page.pageSegments);
	const segmentBundles = toSegmentBundles("page", page.id, normalized);

	const childrenRaw = await prisma.page.findMany({
		where: { parentId: page.id, status: "PUBLIC" },
		orderBy: { order: "asc" },
		select: selectLightPageFields(locale),
	});

	// 型安全なツリー構造用データ（子レベルのみ）
	const toPageSummary = (raw: (typeof childrenRaw)[number]): PageSummary => {
		const segmentBundles = toSegmentBundles(
			"page",
			raw.id,
			normalizePageSegments(raw.pageSegments),
		);

		return {
			...raw,
			createdAt: raw.createdAt.toISOString(),
			segmentBundles,
			children: [],
		} as PageSummary;
	};

	const rootChildren: PageSummary[] = childrenRaw.map(toPageSummary);

	// Prisma で orderBy を指定しているため追加のソートは不要
	// ---------------- DTO 変換 ----------------
	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentBundles,
		children: rootChildren,
	};
}

export async function fetchPaginatedPublicPageSummaries({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	isPopular = false,
	locale = "en",
	currentUserId,
}: FetchParams): Promise<{
	pageSummaries: PageSummary[];
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

	const orderBy = isPopular
		? [
				{ likePages: { _count: Prisma.SortOrder.desc } },
				{ createdAt: Prisma.SortOrder.desc },
			]
		: { createdAt: Prisma.SortOrder.desc };

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

	// ---------------- DTO 変換 ----------------
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
export async function fetchLatestPageTranslationJobs(pageId: number) {
	const locales = await prisma.translationJob.findMany({
		where: { pageId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 2. 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.translationJob.findFirst({
				where: {
					pageId,
					locale,
				},
				orderBy: { createdAt: "desc" },
			}),
		),
	);

	// nullでないレコードのみを返す
	return results.filter((record) => record !== null);
}

export async function fetchPageWithTitleAndComments(pageId: number) {
	const pageWithComments = await prisma.page.findFirst({
		where: { id: pageId },
		include: {
			pageSegments: { where: { number: 0 } },
			pageComments: {
				include: {
					pageCommentSegments: true,
				},
			},
		},
	});
	if (!pageWithComments) return null;
	const title = pageWithComments?.pageSegments[0].text;
	if (!title) return null;
	return {
		...pageWithComments,
		title,
	};
}

export async function fetchPageWithPageSegments(pageId: number) {
	const pageWithSegments = await prisma.page.findFirst({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			createdAt: true,
			pageSegments: {
				select: {
					id: true,
					number: true,
					text: true,
				},
			},
		},
	});

	if (!pageWithSegments) return null;
	const title = pageWithSegments.pageSegments.filter(
		(item) => item.number === 0,
	)[0].text;

	return {
		...pageWithSegments,
		title,
	};
}

export async function fetchPageIdBySlug(slug: string) {
	return await prisma.page.findFirst({
		where: { slug },
		select: { id: true },
	});
}

export async function fetchPageViewCount(pageId: number): Promise<number> {
	const view = await prisma.pageView.findUnique({
		where: { pageId },
		select: { count: true },
	});
	return view?.count ?? 0;
}

export async function fetchPageViewCounts(
	pageIds: number[],
): Promise<Record<number, number>> {
	if (pageIds.length === 0) return {};
	const views = await prisma.pageView.findMany({
		where: { pageId: { in: pageIds } },
		select: { pageId: true, count: true },
	});
	return views.reduce<Record<number, number>>((acc, v) => {
		acc[v.pageId] = v.count;
		return acc;
	}, {});
}

export async function fetchChildPages(
	parentId: number,
	locale: string,
): Promise<PageSummary[]> {
	const raws = await prisma.page.findMany({
		where: { parentId, status: "PUBLIC" },
		orderBy: { order: "asc" },
		select: selectLightPageFields(locale),
	});
	return raws.map((raw) => ({
		...raw,
		createdAt: raw.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			raw.id,
			normalizePageSegments(raw.pageSegments),
		),
		children: [],
	})) as PageSummary[];
}

const selectLightPageFields = (locale = "en") => ({
	id: true,
	slug: true,
	order: true,
	status: true,
	parentId: true,
	sourceLocale: true,
	createdAt: true,
	user: {
		select: selectUserFields(),
	},
	tagPages: {
		include: {
			tag: true,
		},
	},
	_count: {
		select: {
			pageComments: true,
			children: true,
		},
	},
	pageSegments: {
		where: { number: 0 },
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
				take: 1, // タイトル用に最良の翻訳 1 件だけ取得
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
