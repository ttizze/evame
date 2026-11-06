import { fetchPaginatedPageLists } from "@/app/[locale]/_db/page-list.server";
import {
	fetchFollowerList,
	fetchFollowingList,
	fetchUserByHandle,
	getFollowCounts,
} from "../_db/queries";

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

	const [followCounts, followerList, followingList, pageLists] =
		await Promise.all([
			getFollowCounts(pageOwner.id),
			fetchFollowerList(pageOwner.id),
			fetchFollowingList(pageOwner.id),
			fetchPaginatedPageLists({
				locale,
				page,
				pageOwnerId: pageOwner.id,
				pageSize: 5,
				sort,
			}),
		]);

	return {
		pageOwner,
		followCounts,
		followerList,
		followingList,
		pageForLists: pageLists.pageForLists,
		totalPages: pageLists.totalPages,
	};
}
