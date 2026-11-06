import { parseReaderRoute } from "@/app/_domain/reader-route";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { fetchPaginatedPageLists } from "@/app/[locale]/_db/page-list.server";
import { loadAboutPage } from "@/app/[locale]/(common-layout)/_components/about-section/service/load-about-page";
import { loadSocialProofStats } from "@/app/[locale]/(common-layout)/_components/about-section/service/load-social-proof-stats";
import { getHomeMetadata } from "@/app/[locale]/(common-layout)/_components/home/metadata";
import { loadHomePage } from "@/app/[locale]/(common-layout)/_components/home/service/load-home-page";
import { fetchPaginatedPublicNewestPageListsByTag } from "@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/_db/queries";
import { fetchProfilePage } from "@/app/[locale]/(common-layout)/[handle]/_service/profile";
import { buildPageMetadata } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/page-metadata";
import { getProfileMetadata } from "@/app/[locale]/(common-layout)/[handle]/metadata";
import { getAboutMetadata } from "@/app/[locale]/(common-layout)/about/metadata";
import { getNewPagesMetadata } from "@/app/[locale]/(common-layout)/new-pages/metadata";
import { fetchSearchResults } from "@/app/[locale]/(common-layout)/search/_db/queries";
import { getSearchMetadata } from "@/app/[locale]/(common-layout)/search/metadata";
import { getTagMetadata } from "@/app/[locale]/(common-layout)/tag/[tagName]/metadata";
import { loadPageComments } from "../../_service/load-page-comments";
import { loadPageDetail } from "../../_service/load-page-detail";
export async function loadReaderData(
	pathname: string,
	search: string,
	requestHeaders: Headers,
) {
	const route = parseReaderRoute(pathname, search);
	if (!route) return null;
	switch (route.kind) {
		case "home":
			return {
				...route,
				metadata: getHomeMetadata(route.locale),
				cacheable: true,
				data: await loadHomePage(route.locale),
			};
		case "about": {
			const [pageDetail, stats] = await Promise.all([
				loadAboutPage(route.locale),
				loadSocialProofStats(),
			]);
			const data = { pageDetail, stats };
			return data.pageDetail
				? {
						...route,
						metadata: getAboutMetadata(route.locale),
						cacheable: true,
						data,
					}
				: null;
		}
		case "article": {
			const data = await loadPageDetail(
				route.locale,
				route.handle,
				route.pageSlug,
				requestHeaders,
			);
			if (!data) return null;
			const comments = await loadPageComments(
				data.pageDetail.id,
				route.locale,
				route.page,
				requestHeaders,
			);
			const metadata = buildPageMetadata({
				pageDetail: data.pageDetail,
				description: data.description,
				completedTranslationLocales: data.completedTranslationLocales,
			});
			return {
				...route,
				metadata: {
					title: metadata.title,
					description: metadata.description,
					alternates: {
						canonical: metadata.canonicalUrl,
						languages: metadata.alternateLocales ?? {},
					},
					image: metadata.openGraph.images[0]?.url,
				},
				cacheable: data.pageDetail.status === "PUBLIC",
				data: { ...data, comments },
			};
		}
		case "profile": {
			const data = await fetchProfilePage({
				handle: route.handle,
				locale: route.locale,
				page: route.page,
				sort: route.sort,
			});
			return data
				? {
						...route,
						metadata: getProfileMetadata(route.locale, data.pageOwner),
						cacheable: true,
						data,
					}
				: null;
		}
		case "new":
			return {
				...route,
				metadata: getNewPagesMetadata(route.locale),
				cacheable: true,
				data: await fetchPaginatedPageLists({
					locale: route.locale,
					page: route.page,
					pageSize: 5,
					pageOwnerId: null,
					sort: "new",
				}),
			};
		case "tag":
			return {
				...route,
				metadata: getTagMetadata(route.locale, route.tagName),
				cacheable: true,
				data: await fetchPaginatedPublicNewestPageListsByTag({
					locale: route.locale,
					page: route.page,
					tagName: route.tagName,
					pageSize: 5,
				}),
			};
		case "search":
			return {
				...route,
				metadata: getSearchMetadata(route.locale),
				cacheable: false,
				data: await fetchSearchResults(route),
			};
		case "privacy":
		case "terms":
			return {
				...route,
				metadata: {
					title: `${route.kind === "terms" ? "Terms of Service" : "Privacy Policy"} | Evame`,
					description:
						route.kind === "terms"
							? "Evame Terms of Service. Learn about user responsibilities, content licensing, and platform usage guidelines."
							: "Evame Privacy Policy. Learn how we collect, use, and protect your personal data.",
					alternates: buildAlternates(route.locale, `/${route.kind}`),
				},
				cacheable: true,
				data: null,
			};
	}
}
