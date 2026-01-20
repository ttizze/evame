import type { Metadata } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchCompletedTranslationJobs } from "@/app/[locale]/_db/page-utility-queries.server";
import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import { buildAlternateLocales } from "../_domain/build-alternate-locales";

export async function generatePageMetadata(
	pageDetail: PageDetail,
): Promise<Metadata> {
	const { title, status, slug, sourceLocale } = pageDetail;
	const isDraft = status !== "PUBLIC";
	const completedTranslationJobs = await fetchCompletedTranslationJobs(
		pageDetail.id,
	);

	const description = await mdastToText(pageDetail.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${sourceLocale}&slug=${slug}`;
	const displayTitle = isDraft ? `${title} (Draft)` : title;
	const canonicalUrl = `${BASE_URL}/${sourceLocale}/user/${pageDetail.userHandle}/page/${slug}`;
	const translatedLocales = completedTranslationJobs.map((job) => job.locale);

	return {
		title: displayTitle,
		description,
		...(isDraft && { robots: { index: false, follow: false } }),
		openGraph: {
			type: "article",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		alternates: {
			canonical: canonicalUrl,
			...(translatedLocales.length > 0 && {
				languages: buildAlternateLocales({
					page: pageDetail,
					translatedLocales,
				}),
			}),
		},
	};
}
