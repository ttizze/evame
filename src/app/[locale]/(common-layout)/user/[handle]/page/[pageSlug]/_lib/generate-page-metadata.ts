import type { Metadata } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import { mdastToText } from "@/app/[locale]/_lib/mdast-to-text";
import { buildAlternateLocales } from "./build-alternate-locales";
import type { fetchPageContext } from "./fetch-page-context";

interface GeneratePageMetadataParams {
	pageData: Awaited<ReturnType<typeof fetchPageContext>>;
	locale: string;
	pageSlug: string;
	isPreview?: boolean;
}

export async function generatePageMetadata({
	pageData,
	locale,
	pageSlug,
	isPreview = false,
}: GeneratePageMetadataParams): Promise<Metadata> {
	const { pageDetail, pageTranslationJobs, title } = pageData;

	const description = await mdastToText(pageDetail.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageSlug}`;
	const displayTitle = isPreview ? `${title} (Preview)` : title;

	return {
		title: displayTitle,
		description,
		...(isPreview && { robots: { index: false, follow: false } }),
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
			languages: buildAlternateLocales(
				pageDetail,
				pageTranslationJobs,
				pageDetail.user.handle,
				locale,
			),
		},
	};
}
