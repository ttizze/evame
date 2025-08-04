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

	const staticLocales = ["en", "ja"];
	const staticRoutes = ["/", "/search"].flatMap((route) =>
		staticLocales.map((locale) => ({
			url: `${BASE_URL}/${locale}${route === "/" ? "" : route}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: route === "/" ? 1 : 0.8,
		})),
	);

	/* ------- 動的ルート ------- */
	const pageRoutes = pages.flatMap((page: PageWithUserAndTranslation) => {
		const locales =
			page.translationJobs.length > 0
				? page.translationJobs.map(({ locale }) => locale)
				: ["en"];

		return locales.map((locale) => ({
			url: `${BASE_URL}/${locale}/user/${page.user.handle}/page/${page.slug}`,
			lastModified: new Date(page.updatedAt),
			changeFrequency: "daily" as const,
			priority: 0.7,
		}));
	});
	return id === 0 ? [...staticRoutes, ...pageRoutes] : pageRoutes;
}
export const dynamic = "force-dynamic";

export const revalidate = 36000;
