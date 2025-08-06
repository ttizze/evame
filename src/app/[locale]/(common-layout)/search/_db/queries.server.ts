// app/routes/search/functions/queries.server.ts

import type { Tag } from "@prisma/client";
import {
	searchPagesByContent,
	searchPagesByTag,
	searchPagesByTitle,
} from "@/app/[locale]/_db/page-list-queries.server";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";
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

	let pageSummaries: PageForList[] | undefined;
	let tags: Tag[] | undefined;
	let users: SanitizedUser[] | undefined;
	let totalCount = 0;

	switch (category) {
		case "title": {
			const { pageForLists: resultPages, total } = await searchPagesByTitle(
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
			const { pageForLists: resultPages, total } = await searchPagesByContent(
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
				const { pageForLists: resultPages, total } = await searchPagesByTag(
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

/** タグ検索 (Tag.name) → Tag[] */
async function searchTags(
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
async function searchUsers(
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
