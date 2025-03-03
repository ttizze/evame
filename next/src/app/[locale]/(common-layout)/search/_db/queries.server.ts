// app/routes/search/functions/queries.server.ts

import type { PageCardLocalizedType } from "@/app/[locale]/_db/queries.server";
import { createPageCardSelect } from "@/app/[locale]/_db/queries.server";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";
import type { Tag } from "@prisma/client";
/** タイトル検索 */
export async function searchTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pages: PageCardLocalizedType[];
	totalCount: number;
}> {
	const pageCardSelect = createPageCardSelect(locale);
	const [pages, count] = await Promise.all([
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
			select: pageCardSelect,
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

	const pagesWithInfo = pages.map((page) => ({
		...page,
		createdAt: new Date(page.createdAt).toLocaleDateString(locale),
	})) as PageCardLocalizedType[];

	return { pages: pagesWithInfo, totalCount: count };
}

/** タグ名でページを検索 */
export async function searchByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pages: PageCardLocalizedType[];
	totalCount: number;
}> {
	const pageCardSelect = createPageCardSelect(locale);
	const [pages, count] = await Promise.all([
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
			select: pageCardSelect,
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

	const pagesWithInfo = pages.map((page) => ({
		...page,
		createdAt: new Date(page.createdAt).toLocaleDateString(locale),
	})) as PageCardLocalizedType[];

	return { pages: pagesWithInfo, totalCount: count };
}

/** コンテンツ検索 */
export async function searchContent(
	query: string,
	skip: number,
	take: number,
	locale = "en-US",
): Promise<{
	pages: PageCardLocalizedType[];
	totalCount: number;
}> {
	const pageCardSelect = createPageCardSelect(locale);
	const [pages, count] = await Promise.all([
		prisma.page.findMany({
			skip,
			take,
			where: {
				content: { contains: query, mode: "insensitive" },
				status: "PUBLIC",
			},
			select: pageCardSelect,
		}),
		prisma.page.count({
			where: {
				content: { contains: query, mode: "insensitive" },
				status: "PUBLIC",
			},
		}),
	]);

	const pagesWithInfo = pages.map((page) => ({
		...page,
		createdAt: new Date(page.createdAt).toLocaleDateString(locale),
	})) as PageCardLocalizedType[];

	return { pages: pagesWithInfo, totalCount: count };
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
