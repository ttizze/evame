import type { MetadataRoute } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import {
	fetchPagesWithUserAndTranslation,
	type PageWithUserAndTranslation,
} from "@/app/_db/sitemap-queries.server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const locales = ["en", "ja"];
	const routes = ["/", "/search"];

	const staticRoutes = routes.flatMap((route) =>
		locales.map((locale) => ({
			url: `${BASE_URL}/${locale}${route === "/" ? "" : route}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: route === "/" ? 1 : 0.8,
		})),
	);

	try {
		// 直接DBからページデータを取得
		const pages = await fetchPagesWithUserAndTranslation();

		// generate page url
		const pageRoutes = pages.flatMap((page: PageWithUserAndTranslation) => {
			// translationInfo に値がある場合はその locale を使用、なければ 'en' を使用する
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
		return [...staticRoutes, ...pageRoutes];
	} catch (error) {
		console.error("Error generating sitemap:", error);
		return staticRoutes;
	}
}
