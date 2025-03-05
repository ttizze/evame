import type { SanitizedUser } from "@/app/types";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tag } from "@prisma/client";
import dynamic from "next/dynamic";
import {
	searchByTag,
	searchContent,
	searchTags,
	searchTitle,
	searchUsers,
} from "./_db/queries.server";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
const DynamicSearchPageClient = dynamic(
	() => import("./search.client").then((mod) => mod.SearchPageClient),
	{
		loading: () => <Skeleton className="h-[500px] w-full" />,
	},
);

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	category: parseAsString.withDefault("title"),
	tagPage: parseAsString.withDefault("false"),
};
const loadSearchParams = createLoader(searchParamsSchema);
export default async function Page({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const { locale } = await params;
	const { page, query, category, tagPage } = await loadSearchParams(searchParams);
	if (!query || page < 1) {
		return (
			<DynamicSearchPageClient pages={[]} tags={[]} users={[]} totalPages={0} />
		);
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
			const { pages: resultPages, totalCount: cnt } = await searchTitle(
				query,
				skip,
				take,
				locale,
			);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "content": {
			const { pages: resultPages, totalCount: cnt } = await searchContent(
				query,
				skip,
				take,
				locale,
			);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "tags": {
			if (tagPage === "true") {
				const { pages: resultPages, totalCount: cnt } = await searchByTag(
					query,
					skip,
					take,
					locale,
				);
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

	const totalPages = Math.ceil(totalCount / take);

	return (
		<DynamicSearchPageClient
			pages={pages}
			tags={tags}
			users={users}
			totalPages={totalPages}
		/>
	);
}
