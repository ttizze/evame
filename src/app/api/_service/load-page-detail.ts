import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { queryPageDetail } from "@/app/[locale]/_db/queries";
import { loadPageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";

export async function loadPageDetail(
	locale: string,
	handle: string,
	pageSlug: string,
	requestHeaders: Headers,
) {
	const pageDetail = await queryPageDetail(pageSlug, locale);
	if (!pageDetail || pageDetail.userHandle !== handle) return null;

	if (pageDetail.status !== "PUBLIC") {
		const currentUser = await getCurrentUserFromHeaders(requestHeaders);
		if (!currentUser || currentUser.handle !== pageDetail.userHandle) {
			return null;
		}
	}

	if (!pageDetail.segments.some((segment) => segment.number === 0)) {
		return null;
	}

	return loadPageContentData(pageDetail, locale);
}
