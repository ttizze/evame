// app/routes/search/functions/queries.server.ts

import { selectPagesWithDetails } from "@/app/[locale]/_db/page-queries.server";
import { normalizePageSegments } from "@/app/[locale]/_db/page-queries.server";
import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import type { PageSummary } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";
import type { Tag } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { Category } from "../constants";
/** 検索結果を統合的に取得する */
export async function fetchSearchResults({
	query,
	category,
	page,
	locale = "en-US",
	tagPage = "false",
}: {
	query: string;
	category: Category;
	page: number;
	locale?: string;
	tagPage?: string;
}) {
	if (!query || page < 1) {
		return {
			pages: [],
			tags: [],
			users: [],
			totalPages: 0,
		};
	}

	const PAGE_SIZE = 10;
	const skip = (page - 1) * PAGE_SIZE;
	const take = PAGE_SIZE;

	let pageSummaries: PageSummary[] | undefined = undefined;
	let tags: Tag[] | undefined = undefined;
	let users: SanitizedUser[] | undefined = undefined;
	let totalCount = 0;

	switch (category) {
		case "title": {
			const { pageSummaries: resultPages, total } = await searchTitle(
				query,
				skip,
				take,
				locale,
			);
			pageSummaries = resultPages;
			totalCount = total;
			break;
		}
		case "content": {
			const { pageSummaries: resultPages, total } = await searchContent(
				query,
				skip,
				take,
				locale,
			);
			pageSummaries = resultPages;
			totalCount = total;
			break;
		}
		case "tags": {
			if (tagPage === "true") {
				const { pageSummaries: resultPages, total } = await searchByTag(
					query,
					skip,
					take,
					locale,
				);
				pageSummaries = resultPages;
				totalCount = total;
			} else {
				const { tags: resultTags, totalCount: cnt } = await searchTags(
					query,
					skip,
					take,
				);
				tags = resultTags;
				totalCount = cnt;
			}
			break;
		}
		case "user": {
			const { users: resultUsers, totalCount: cnt } = await searchUsers(
				query,
				skip,
				take,
			);
			users = resultUsers;
			totalCount = cnt;
			break;
		}
		default: {
			throw new Error("Invalid category");
		}
	}

	const totalPages = Math.ceil(totalCount / PAGE_SIZE);

	return {
		pageSummaries,
		tags,
		users,
		totalPages,
	};
}

/** タイトル検索 */
export async function searchTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
	currentUserId?: string,
): Promise<{
	pageSummaries: PageSummary[];
	total: number;
}> {
	const select = selectPagesWithDetails(true, locale, currentUserId);
	const baseWhere: Prisma.PageWhereInput = {
		status: "PUBLIC",
		pageSegments: {
			some: {
				text: { contains: query, mode: "insensitive" },
				number: 0,
			},
		},
	};
	const [rawPages, total] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			skip,
			take,
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
		total,
	};
}
/** タグ名でページを検索 */
export async function searchByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageSummaries: PageSummary[];
	total: number;
}> {
	const select = selectPagesWithDetails(true, locale);
	const [rawPages, total] = await Promise.all([
		prisma.page.findMany({
			skip,
			take,
			where: {
				tagPages: {
					some: {
						tag: {
							name: tagName,
						},
					},
				},
				status: "PUBLIC",
			},
			select,
		}),
		prisma.page.count({
			where: {
				tagPages: {
					some: {
						tag: {
							name: tagName,
						},
					},
				},
				status: "PUBLIC",
			},
		}),
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

	return { pageSummaries: pages, total };
}

/** コンテンツ検索 */
export async function searchContent(
	query: string,
	skip: number,
	take: number,
	locale = "en-US",
): Promise<{
	pageSummaries: PageSummary[];
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
		return { pageSummaries: [], total };
	}

	/* 4. page と関連情報をフェッチ ------------------------------------ */
	const select = selectPagesWithDetails(true, locale);
	const rawPages = await prisma.page.findMany({
		where: { id: { in: pageIds } },
		select,
	});

	/* 5. SegmentBundle へ変換して整形 -------------------------------- */
	const pages = rawPages.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			p.id,
			normalizePageSegments(p.pageSegments),
		),
	}));

	return { pageSummaries: pages, total };
}
/** タグ検索 (Tag.name) → Tag[] */
export async function searchTags(
	query: string,
	skip: number,
	take: number,
): Promise<{
	tags: Tag[];
	totalCount: number;
}> {
	const [tags, count] = await Promise.all([
		prisma.tag.findMany({
			skip,
			take,
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
		prisma.tag.count({
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
	]);
	return { tags, totalCount: count };
}

/** ユーザー検索 */
export async function searchUsers(
	query: string,
	skip: number,
	take: number,
): Promise<{
	users: SanitizedUser[];
	totalCount: number;
}> {
	const [users, count] = await Promise.all([
		prisma.user.findMany({
			skip,
			take,
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
		prisma.user.count({
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
	]);
	const sanitizedUsers = users.map((user) => sanitizeUser(user));
	return { users: sanitizedUsers, totalCount: count };
}
