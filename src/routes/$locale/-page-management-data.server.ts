import { redirect } from "@tanstack/react-router";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import {
	fetchPageViewCounts,
	fetchPaginatedOwnPages,
} from "@/app/[locale]/(common-layout)/[handle]/page-management/_db/queries.server";
import type { PageManagementInput } from "./-page-management-data";

export async function loadPageManagementData(
	data: PageManagementInput,
	requestHeaders: Headers,
) {
	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
	if (!currentUser) {
		throw redirect({ href: `/${data.locale}/auth/login` });
	}
	if (currentUser.handle !== data.handle) {
		return null;
	}

	const ownPages = await fetchPaginatedOwnPages(
		currentUser.id,
		data.locale,
		data.page,
		10,
		data.query,
	);
	const pageViewCounts = await fetchPageViewCounts(
		ownPages.pagesWithTitle.map((page) => page.id),
	);

	return { ...ownPages, pageViewCounts };
}
