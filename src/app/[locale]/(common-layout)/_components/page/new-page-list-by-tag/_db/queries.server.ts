import { cacheLife, cacheTag } from "next/cache";
import {
	buildPageListQuery,
	fetchTagsMap,
	toPageForList,
} from "@/app/[locale]/_db/page-list.server";
import type { PageForList } from "@/app/[locale]/types";
import { db } from "@/db";

export interface FetchPaginatedNewestPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
}

export interface FetchNewestPageListsByTagsParams {
	tagNames: string[];
	pageSize?: number;
	locale?: string;
}

/**
 * Fetch paginated public page summaries filtered by given tag name and ordered by newest (createdAt desc).
 */
export async function fetchPaginatedPublicNewestPageListsByTag({
	tagName,
	page = 1,
	pageSize = 5,
	locale = "en",
}: FetchPaginatedNewestPagesByTagParams): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const offset = (page - 1) * pageSize;

	const [rows, totalResult] = await Promise.all([
		buildPageListQuery(locale)
			.innerJoin("tagPages", "tagPages.pageId", "pages.id")
			.innerJoin("tags", "tagPages.tagId", "tags.id")
			.where("tags.name", "=", tagName)
			.where("pages.status", "=", "PUBLIC")
			.orderBy("pages.createdAt", "desc")
			.limit(pageSize)
			.offset(offset)
			.execute(),
		db
			.selectFrom("tagPages")
			.innerJoin("tags", "tagPages.tagId", "tags.id")
			.innerJoin("pages", "tagPages.pageId", "pages.id")
			.select((eb) =>
				eb.fn.count<number>("tagPages.pageId").distinct().as("count"),
			)
			.where("tags.name", "=", tagName)
			.where("pages.status", "=", "PUBLIC")
			.executeTakeFirst(),
	]);

	const pageIds = rows.map((row) => row.id);
	const tagsMap = await fetchTagsMap(pageIds);
	const pageForLists = rows.map((row) =>
		toPageForList(row, tagsMap.get(row.id) || []),
	);

	return {
		pageForLists,
		totalPages: Math.ceil(Number(totalResult?.count ?? 0) / pageSize),
	};
}

export async function fetchPaginatedPublicNewestPageListsByTagForTopPage(
	params: FetchPaginatedNewestPagesByTagParams,
) {
	"use cache";
	const tagName = params.tagName;
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 5;
	const locale = params.locale ?? "en";

	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(`top:new-page-list-by-tag:${locale}:${tagName}:${page}:${pageSize}`);

	return await fetchPaginatedPublicNewestPageListsByTag({
		tagName,
		page,
		pageSize,
		locale,
	});
}

export async function fetchPublicNewestPageListsByTags({
	tagNames,
	pageSize = 5,
	locale = "en",
}: FetchNewestPageListsByTagsParams): Promise<
	{
		tagName: string;
		pageForLists: PageForList[];
	}[]
> {
	const orderedTagNames = Array.from(new Set(tagNames));
	if (orderedTagNames.length === 0) return [];

	const rankedQuery = buildPageListQuery(locale)
		.innerJoin("tagPages", "tagPages.pageId", "pages.id")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select((eb) => [
			"tags.name as tagName",
			eb.fn
				.agg<number>("row_number")
				.over((ob) =>
					ob.partitionBy("tags.name").orderBy("pages.createdAt", "desc"),
				)
				.as("rowNumber"),
		])
		.where("tags.name", "in", orderedTagNames)
		.where("pages.status", "=", "PUBLIC");

	const rows = await db
		.selectFrom(rankedQuery.as("ranked"))
		.selectAll()
		.where("ranked.rowNumber", "<=", pageSize)
		.orderBy("ranked.tagName")
		.orderBy("ranked.rowNumber")
		.execute();

	const pageIds = Array.from(new Set(rows.map((row) => row.id)));
	const tagsMap = await fetchTagsMap(pageIds);
	const grouped = new Map<string, PageForList[]>();
	for (const tagName of orderedTagNames) {
		grouped.set(tagName, []);
	}

	for (const row of rows) {
		const list = grouped.get(row.tagName);
		if (!list) continue;
		list.push(toPageForList(row, tagsMap.get(row.id) || []));
	}

	return orderedTagNames.map((tagName) => ({
		tagName,
		pageForLists: grouped.get(tagName) ?? [],
	}));
}

export async function fetchPublicNewestPageListsByTagsForTopPage(
	params: FetchNewestPageListsByTagsParams,
) {
	"use cache";
	const locale = params.locale ?? "en";
	const pageSize = params.pageSize ?? 5;
	const tagNames = params.tagNames;

	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(
		`top:new-page-lists-by-tags:${locale}:${pageSize}:${tagNames.join("|")}`,
	);

	return await fetchPublicNewestPageListsByTags({
		tagNames,
		pageSize,
		locale,
	});
}
