// app/routes/search/functions/queries.server.ts

import { createPageWithRelationsSelect } from "@/app/[locale]/_db/queries.server";
import type { PageWithRelationsListType } from "@/app/[locale]/_db/queries.server";
import { transformToPageWithSegmentAndTranslations } from "@/app/[locale]/_db/queries.server";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";
import type { Tag } from "@prisma/client";
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

	let pages = undefined;
	let tags: Tag[] | undefined = undefined;
	let users: SanitizedUser[] | undefined = undefined;
	let totalCount = 0;

	switch (category) {
		case "title": {
			const { pagesWithRelations: resultPages, totalCount: cnt } =
				await searchTitle(query, skip, take, locale);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "content": {
			const { pagesWithRelations: resultPages, totalCount: cnt } =
				await searchContent(query, skip, take, locale);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "tags": {
			if (tagPage === "true") {
				const { pagesWithRelations: resultPages, totalCount: cnt } =
					await searchByTag(query, skip, take, locale);
				pages = resultPages;
				totalCount = cnt;
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
		pages,
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
): Promise<{
	pagesWithRelations: PageWithRelationsListType[];
	totalCount: number;
}> {
	const pageWithRelationsSelect = createPageWithRelationsSelect(locale);
	const [rawPagesWithRelations, count] = await Promise.all([
		prisma.page.findMany({
			skip,
			take,
			where: {
				pageSegments: {
					some: {
						text: { contains: query, mode: "insensitive" },
						number: 0,
					},
				},
				status: "PUBLIC",
			},
			select: pageWithRelationsSelect,
		}),
		prisma.page.count({
			where: {
				pageSegments: {
					some: {
						text: { contains: query, mode: "insensitive" },
						number: 0,
					},
				},
				status: "PUBLIC",
			},
		}),
	]);
	const pagesWithRelations = await Promise.all(
		rawPagesWithRelations.map((page) =>
			transformToPageWithSegmentAndTranslations(page),
		),
	);
	return { pagesWithRelations, totalCount: count };
}

/** タグ名でページを検索 */
export async function searchByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pagesWithRelations: PageWithRelationsListType[];
	totalCount: number;
}> {
	const pageWithRelationsSelect = createPageWithRelationsSelect(locale);
	const [rawPagesWithRelations, count] = await Promise.all([
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
			select: pageWithRelationsSelect,
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
	const pagesWithRelations = await Promise.all(
		rawPagesWithRelations.map((page) =>
			transformToPageWithSegmentAndTranslations(page),
		),
	);
	return { pagesWithRelations, totalCount: count };
}

/** コンテンツ検索 */
export async function searchContent(
	query: string,
	skip: number,
	take: number,
	locale = "en-US",
): Promise<{
	pagesWithRelations: PageWithRelationsListType[];
	totalCount: number;
}> {
	const pageWithRelationsSelect = createPageWithRelationsSelect(locale);
	const [rawPagesWithRelations, count] = await Promise.all([
		prisma.page.findMany({
			skip,
			take,
			where: {
				content: { contains: query, mode: "insensitive" },
				status: "PUBLIC",
			},
			select: pageWithRelationsSelect,
		}),
		prisma.page.count({
			where: {
				content: { contains: query, mode: "insensitive" },
				status: "PUBLIC",
			},
		}),
	]);
	const pagesWithRelations = await Promise.all(
		rawPagesWithRelations.map((page) =>
			transformToPageWithSegmentAndTranslations(page),
		),
	);

	return { pagesWithRelations, totalCount: count };
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
