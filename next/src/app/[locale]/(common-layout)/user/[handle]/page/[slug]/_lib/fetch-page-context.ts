import { fetchPageDetail } from "@/app/[locale]/_db/page-queries.server";
import { fetchLatestPageTranslationJobs } from "@/app/[locale]/_db/page-queries.server";
import { getCurrentUser } from "@/auth";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchLatestUserTranslationJob } from "../_db/queries.server";
import { fetchPageCommentsCount } from "../_db/queries.server";

export const fetchPageContext = cache(
	async (
		slug: string,
		locale: string,
		showOriginal: boolean,
		showTranslation: boolean,
	) => {
		const currentUser = await getCurrentUser();

		const pageDetail = await fetchPageDetail(slug, locale, currentUser?.id);

		if (!pageDetail || pageDetail.status === "ARCHIVE") {
			return notFound();
		}
		const pageTitleWithTranslations = pageDetail.segmentBundles.find(
			(item) => item.segment.number === 0,
		);
		if (!pageTitleWithTranslations) {
			return null;
		}
		let title: string;
		if (showTranslation && showOriginal) {
			title = `${pageTitleWithTranslations.segment.text} - ${pageTitleWithTranslations.best?.text}`;
		} else if (showTranslation) {
			title =
				pageTitleWithTranslations.best?.text ??
				pageTitleWithTranslations.segment.text;
		} else {
			title = pageTitleWithTranslations.segment.text;
		}
		const [pageTranslationJobs, latestUserTranslationJob, pageCommentsCount] =
			await Promise.all([
				fetchLatestPageTranslationJobs(pageDetail.id),
				fetchLatestUserTranslationJob(pageDetail.id, currentUser?.id ?? "0"),
				fetchPageCommentsCount(pageDetail.id),
			]);
		return {
			pageDetail,
			currentUser,
			title,
			pageTranslationJobs,
			latestUserTranslationJob,
			pageCommentsCount,
		};
	},
);
