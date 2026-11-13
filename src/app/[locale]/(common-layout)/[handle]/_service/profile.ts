import { fetchPaginatedPageLists } from "@/app/[locale]/_db/page-list.server";
import { fetchUserByHandle } from "../_db/queries";

export async function fetchProfilePage({
	handle,
	locale,
	page,
	sort,
}: {
	handle: string;
	locale: string;
	page: number;
	sort: "popular" | "new";
}) {
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return null;
	}

	const pageLists = await fetchPaginatedPageLists({
		locale,
		page,
		pageOwnerId: pageOwner.id,
		pageSize: 5,
		sort,
	});

	return {
		pageOwner,
		pageForLists: pageLists.pageForLists,
		totalPages: pageLists.totalPages,
	};
}
