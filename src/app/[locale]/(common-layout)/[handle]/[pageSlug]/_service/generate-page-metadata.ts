import type { Metadata } from "next";
import { fetchCompletedTranslationJobs } from "@/app/[locale]/_db/page-utility-queries.server";
import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import { buildPageMetadata } from "./page-metadata";

export async function generatePageMetadata(
	pageDetail: PageDetail,
): Promise<Metadata> {
	const [completedTranslationJobs, description] = await Promise.all([
		fetchCompletedTranslationJobs(pageDetail.id),
		mdastToText(pageDetail.mdastJson).then((text) => text.slice(0, 200)),
	]);
	const metadata = buildPageMetadata({
		completedTranslationLocales: completedTranslationJobs.map(
			(job) => job.locale,
		),
		description,
		pageDetail,
	});

	return {
		title: metadata.title,
		description: metadata.description,
		...(metadata.isDraft && { robots: { index: false, follow: false } }),
		openGraph: metadata.openGraph,
		twitter: metadata.twitter,
		alternates: {
			canonical: metadata.canonicalUrl,
			...(metadata.alternateLocales && {
				languages: metadata.alternateLocales,
			}),
		},
	};
}
