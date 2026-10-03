import { BASE_URL } from "@/app/_constants/base-url";
import type { PageDetail } from "@/app/[locale]/types";
import { buildAlternateLocales } from "../_domain/build-alternate-locales";

export function buildPageMetadata({
	pageDetail,
	description,
	completedTranslationLocales,
}: {
	pageDetail: PageDetail;
	description: string;
	completedTranslationLocales: string[];
}) {
	const isDraft = pageDetail.status !== "PUBLIC";
	const ogImageUrl = `${BASE_URL}/api/og?locale=${pageDetail.sourceLocale}&slug=${pageDetail.slug}`;
	const canonicalUrl = `${BASE_URL}/${pageDetail.sourceLocale}/${pageDetail.userHandle}/${pageDetail.slug}`;

	return {
		title: isDraft ? `${pageDetail.title} (Draft)` : pageDetail.title,
		description,
		isDraft,
		openGraph: {
			type: "article" as const,
			title: pageDetail.title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image" as const,
			title: pageDetail.title,
			description,
			images: [ogImageUrl],
		},
		canonicalUrl,
		alternateLocales:
			completedTranslationLocales.length > 0
				? buildAlternateLocales({
						page: pageDetail,
						translatedLocales: completedTranslationLocales,
					})
				: undefined,
	};
}
