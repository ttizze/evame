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
	return resolvedId === 0 ? [...staticRoutes, ...pageRoutes] : pageRoutes;
}
