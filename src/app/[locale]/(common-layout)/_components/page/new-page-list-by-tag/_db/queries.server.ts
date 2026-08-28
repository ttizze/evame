import { cacheLife, cacheTag } from "next/cache";
import {
	type FetchNewestPageListsByTagsParams,
	type FetchPaginatedNewestPagesByTagParams,
	fetchPaginatedPublicNewestPageListsByTag,
	fetchPublicNewestPageListsByTags,
} from "./queries";

export type {
	FetchNewestPageListsByTagsParams,
	FetchPaginatedNewestPagesByTagParams,
};
export {
	fetchPaginatedPublicNewestPageListsByTag,
	fetchPublicNewestPageListsByTags,
};

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
