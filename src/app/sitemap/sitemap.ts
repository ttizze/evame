import type { MetadataRoute } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import {
	countPublicPages,
	fetchPagesWithUserAndTranslationChunk,
	type PageWithUserAndTranslation,
} from "@/app/_db/sitemap-queries.server";

const CHUNK = 1_000;

export async function generateSitemaps() {
	const total = await countPublicPages();
	const chunks = Math.ceil(total / CHUNK);
	// [ { id: 0 }, { id: 1 }, ... ] を返す形式が Next.js 流儀
	return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({
	id,
}: {
	id: number;
}): Promise<MetadataRoute.Sitemap> {
	const offset = id * CHUNK;
	const pages = await fetchPagesWithUserAndTranslationChunk({
		limit: CHUNK,
		offset,
	});

	const staticLocales = ["ja", "zh"] as const;
	const staticRoutes = ["/", "/search", "/about"].map((route) => ({
		url: `${BASE_URL}/en${route === "/" ? "" : route}`,
		lastModified: new Date(),
		changeFrequency: "monthly" as const,
		priority: route === "/" ? 1 : 0.8,
		alternates: {
			languages: Object.fromEntries(
				staticLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}${route === "/" ? "" : route}`,
				]),
			),
		},
	}));

	/* ------- 動的ルート ------- */
	const pageRoutes = pages.map((page: PageWithUserAndTranslation) => {
		return {
			url: `${BASE_URL}/${page.sourceLocale}/user/${page.user.handle}/page/${page.slug}`,
			lastModified: new Date(page.updatedAt),
			changeFrequency: "daily" as const,
			priority: 0.7,
			alternates: {
				languages: Object.fromEntries(
					page.translationJobs.map((locale) => [
						locale,
						`${BASE_URL}/${locale}/user/${page.user.handle}/page/${page.slug}`,
					]),
				),
			},
		};
	});
	return id === 0 ? [...staticRoutes, ...pageRoutes] : pageRoutes;
}
