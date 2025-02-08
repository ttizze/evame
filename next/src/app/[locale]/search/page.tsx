import { z } from "zod";

import type { SanitizedUser } from "@/app/types";
import type { Tag } from "@prisma/client";
import { CATEGORIES } from "./constants";
import {
	searchByTag,
	searchContent,
	searchTags,
	searchTitle,
	searchUsers,
} from "./db/queries.server";
import { SearchPageClient } from "./search.client";
const schema = z.object({
	query: z.string().min(1, "Search query is required"),
	category: z.enum(CATEGORIES).default("title"),
	page: z.string().optional(),
	tagPage: z.string().optional(),
});

const PAGE_SIZE = 10;

type Props = {
	params: { locale: string };
	searchParams: URLSearchParams;
};

export default async function Page(props: Props) {
	const { params, searchParams } = await props;
	const { locale } = await params;
	const resolvedSearchParams = await searchParams;
	const result = schema.safeParse(resolvedSearchParams);
	if (!result.success) {
		return <SearchPageClient pages={[]} tags={[]} users={[]} totalPages={0} />;
	}

	const { query, category = "title", page = "1", tagPage } = result.data;
	const currentPage = Number.parseInt(page, 10) || 1;

	const skip = (currentPage - 1) * PAGE_SIZE;
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
	}

	const totalPages = Math.ceil(totalCount / take);

	return (
		<SearchPageClient
			pages={pages}
			tags={tags}
			users={users}
			totalPages={totalPages}
		/>
	);
}
