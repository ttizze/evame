import type { MetadataRoute } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import {
	countPublicPages,
	fetchPagesWithUserAndTranslationChunk,
	fetchPopularTags,
	type PageWithUserAndTranslation,
} from "@/app/_db/sitemap-queries.server";

const CHUNK = 1_000;

export async function generateSitemaps() {
	const total = await countPublicPages();
	// 少なくとも 1 チャンクは返す（id=0 は静的ルートも含めるため）
	const chunks = Math.max(1, Math.ceil(total / CHUNK));
	// [ { id: 0 }, { id: 1 }, ... ] を返す形式が Next.js 流儀
	return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({
	id,
}: {
	id: Promise<number>;
}): Promise<MetadataRoute.Sitemap> {
	const resolvedId = await id;
	const offset = resolvedId * CHUNK;
	const pages = await fetchPagesWithUserAndTranslationChunk({
		limit: CHUNK,
		offset,
	});

	const supportedLocales = ["en", "ja", "zh", "ko", "es"] as const;
	const defaultLocale = "en";

	// 静的ルート
	const staticPaths = ["/", "/search", "/about", "/new-pages"];
	const staticRoutes = staticPaths.map((route) => ({
		url: `${BASE_URL}/${defaultLocale}${route === "/" ? "" : route}`,
		lastModified: new Date(),
		changeFrequency: "monthly" as const,
		priority: route === "/" ? 1 : 0.8,
		alternates: {
			languages: Object.fromEntries(
				supportedLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}${route === "/" ? "" : route}`,
				]),
			),
		},
	}));

	// タグページ
	const popularTags = await fetchPopularTags(50);
	const tagRoutes = popularTags.map((tagName) => ({
		url: `${BASE_URL}/${defaultLocale}/tag/${encodeURIComponent(tagName)}`,
		lastModified: new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.6,
		alternates: {
			languages: Object.fromEntries(
				supportedLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}/tag/${encodeURIComponent(tagName)}`,
				]),
			),
		},
	}));

	/* ------- 動的ルート ------- */
	const pageRoutes = pages.map((page: PageWithUserAndTranslation) => {
		return {
			url: `${BASE_URL}/${page.sourceLocale}/${page.user.handle}/${page.slug}`,
			lastModified: new Date(page.updatedAt),
			changeFrequency: "daily" as const,
			priority: 0.7,
			alternates: {
				languages: Object.fromEntries(
					page.translationJobs.map((job) => [
						job.locale,
						`${BASE_URL}/${job.locale}/${page.user.handle}/${page.slug}`,
					]),
				),
			},
		};
	});
	return resolvedId === 0
		? [...staticRoutes, ...tagRoutes, ...pageRoutes]
		: pageRoutes;
}
