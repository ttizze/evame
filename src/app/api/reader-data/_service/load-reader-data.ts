import { parseReaderRoute } from "@/app/_domain/reader-route";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { fetchPaginatedPageLists } from "@/app/[locale]/_db/page-list.server";
import { querySocialProofStats } from "@/app/[locale]/(common-layout)/_components/about-section/_db/queries";
import { loadAboutPage } from "@/app/[locale]/(common-layout)/_components/about-section/service/load-about-page";
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

// トップ・新着・タグ・著者一覧で、掲載記事と著者名の依存を同じキーへ固定する。
function pageListCacheKeys(
	pages: readonly { id: number; userHandle: string }[],
) {
	return pages.flatMap((page) => [
		`page:${page.id}`,
		`author:${page.userHandle}`,
	]);
}

export async function loadReaderData(
	pathname: string,
	search: string,
	requestHeaders: Headers,
) {
	const route = parseReaderRoute(pathname, search);
	if (!route) return null;
	switch (route.kind) {
		case "home": {
			const data = await loadHomePage(route.locale);
			return {
				...route,
				metadata: getHomeMetadata(route.locale),
				cacheable: true,
				cacheKeys: [
					"list:home",
					...pageListCacheKeys([
						...data.newPages.pageForLists,
						...data.popularPages.pageForLists,
					]),
				],
				data,
			};
		}
		case "about": {
			const [pageDetail, stats] = await Promise.all([
				loadAboutPage(route.locale),
				querySocialProofStats().executeTakeFirstOrThrow(),
			]);
			const data = { pageDetail, stats };
			return data.pageDetail
				? {
						...route,
						metadata: getAboutMetadata(route.locale),
						cacheKeys: ["about"],
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
			const displayedAuthors: string[] = [];
			const navigationNodes = [
				...data.childPages,
				...(data.navigationData?.treeNodes ?? []),
			];
			for (const node of navigationNodes) {
				displayedAuthors.push(`author:${node.userHandle}`);
				navigationNodes.push(...node.children);
			}
			const thread = [...comments.comments];
			for (const comment of thread) {
				displayedAuthors.push(`author:${comment.user.handle}`);
				thread.push(...comment.replies);
			}
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
				cacheKeys: [
					`page:${data.pageDetail.id}`,
					`author:${data.pageDetail.userHandle}`,
					`tree:${data.pageDetail.id}`,
					...(data.navigationData
						? [`tree:${data.navigationData.rootNode.id}`]
						: []),
					...data.ancestorCacheKeys,
					...displayedAuthors,
				],
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
						cacheKeys: [
							`profile:${data.pageOwner.id}`,
							`user:${data.pageOwner.id}`,
							`author:${data.pageOwner.handle}`,
							...pageListCacheKeys(data.pageForLists),
						],
						cacheable: true,
						data,
					}
				: null;
		}
		case "new": {
			const data = await fetchPaginatedPageLists({
				locale: route.locale,
				page: route.page,
				pageSize: 5,
				pageOwnerId: null,
				sort: "new",
			});
			return {
				...route,
				metadata: getNewPagesMetadata(route.locale),
				cacheable: true,
				cacheKeys: ["list:new", ...pageListCacheKeys(data.pageForLists)],
				data,
			};
		}
		case "tag": {
			const data = await fetchPaginatedPublicNewestPageListsByTag({
				locale: route.locale,
				page: route.page,
				tagName: route.tagName,
				pageSize: 5,
			});
			return {
				...route,
				metadata: getTagMetadata(route.locale, route.tagName),
				cacheable: true,
				cacheKeys: [
					`tag:${route.tagName}`,
					...pageListCacheKeys(data.pageForLists),
				],
				data,
			};
		}
		case "search":
			return {
				...route,
				metadata: getSearchMetadata(route.locale),
				cacheable: false,
				cacheKeys: [],
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
				cacheKeys: [],
				data: null,
			};
	}
}
