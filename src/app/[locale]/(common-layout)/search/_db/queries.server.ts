// app/routes/search/functions/queries.server.ts

import { sql } from "kysely";
import {
	searchPagesByContent,
	searchPagesByTag,
	searchPagesByTitle,
} from "@/app/[locale]/_db/page-search.server";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/db";
import { sanitizeUser } from "@/lib/sanitize-user";
import type { Category } from "../constants";

type Tag = {
	id: number;
	name: string;
};

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
	const [tagResults, countResult] = await Promise.all([
		db
			.selectFrom("tags")
			.selectAll()
			.where("name", "ilike", `%${query}%`)
			.limit(take)
			.offset(skip)
			.execute(),
		db
			.selectFrom("tags")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("name", "ilike", `%${query}%`)
			.executeTakeFirst(),
	]);
	return {
		tags: tagResults,
		totalCount: Number(countResult?.count ?? 0),
	};
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
	const [userResults, countResult] = await Promise.all([
		db
			.selectFrom("users")
			.selectAll()
			.where("name", "ilike", `%${query}%`)
			.limit(take)
			.offset(skip)
			.execute(),
		db
			.selectFrom("users")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("name", "ilike", `%${query}%`)
			.executeTakeFirst(),
	]);
	const sanitizedUsers = userResults.map((user) =>
		sanitizeUser({
			...user,
			isAi: user.isAi,
		}),
	);
	return {
		users: sanitizedUsers,
		totalCount: Number(countResult?.count ?? 0),
	};
}
