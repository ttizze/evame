import {
	fetchPaginatedNewPageLists,
	fetchPaginatedPopularPageLists,
} from "@/app/[locale]/_db/page-list.server";
import type { PageForList } from "@/app/[locale]/types";
import type { User } from "@/db/types.helpers";
import {
	fetchFollowerList,
	fetchFollowingList,
	fetchUserByHandle,
	getFollowCounts,
	isFollowing,
} from "../_db/queries";

export type ProfilePageData = {
	pageOwner: Pick<
		User,
		"id" | "handle" | "name" | "image" | "profile" | "twitterHandle"
	>;
	followCounts: { followers: number; following: number };
	followerList: Array<Pick<User, "handle" | "name" | "image">>;
	followingList: Array<Pick<User, "handle" | "name" | "image">>;
	isFollowing: boolean;
	isOwner: boolean;
	pageForLists: PageForList[];
	totalPages: number;
};

export async function fetchProfilePage({
	currentUser,
	handle,
	locale,
	page,
	sort,
}: {
	currentUser: { id: string; handle: string } | null;
	handle: string;
	locale: string;
	page: number;
	sort: "popular" | "new";
}): Promise<ProfilePageData | null> {
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return null;
	}

	const fetchPageLists =
		sort === "popular"
			? fetchPaginatedPopularPageLists
			: fetchPaginatedNewPageLists;
	const [followCounts, followerList, followingList, following, pageLists] =
		await Promise.all([
			getFollowCounts(pageOwner.id),
			fetchFollowerList(pageOwner.id),
			fetchFollowingList(pageOwner.id),
			currentUser
				? isFollowing(currentUser.id, pageOwner.id)
				: Promise.resolve(false),
			fetchPageLists({
				locale,
				page,
				pageOwnerId: pageOwner.id,
				pageSize: 5,
			}),
		]);

	return {
		pageOwner,
		followCounts,
		followerList,
		followingList,
		isFollowing: following,
		isOwner: currentUser?.handle === pageOwner.handle,
		pageForLists: pageLists.pageForLists,
		totalPages: pageLists.totalPages,
	};
}
