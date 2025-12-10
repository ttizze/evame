// app/routes/search/functions/queries.server.ts

import { count, ilike } from "drizzle-orm";
import {
	searchPagesByContent,
	searchPagesByTag,
	searchPagesByTitle,
} from "@/app/[locale]/_db/page-list-queries.server";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/drizzle";
import { tags, users } from "@/drizzle/schema";
import type { Tag } from "@/drizzle/types";
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
	const [tagResults, countResult] = await Promise.all([
		db
			.select()
			.from(tags)
			.where(ilike(tags.name, `%${query}%`))
			.limit(take)
			.offset(skip),
		db
			.select({ count: count() })
			.from(tags)
			.where(ilike(tags.name, `%${query}%`)),
	]);
	return {
		tags: tagResults,
		totalCount: Number(countResult[0]?.count ?? 0),
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
			.select()
			.from(users)
			.where(ilike(users.name, `%${query}%`))
			.limit(take)
			.offset(skip),
		db
			.select({ count: count() })
			.from(users)
			.where(ilike(users.name, `%${query}%`)),
	]);
	const sanitizedUsers = userResults.map((user) => sanitizeUser(user));
	return {
		users: sanitizedUsers,
		totalCount: Number(countResult[0]?.count ?? 0),
	};
}
