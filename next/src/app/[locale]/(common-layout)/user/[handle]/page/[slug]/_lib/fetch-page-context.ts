import { fetchPageDetail } from "@/app/[locale]/_db/page-queries.server";
import { fetchLatestPageTranslationJobs } from "@/app/[locale]/_db/page-queries.server";
import {
	type DisplayMode,
	decideFromLocales,
} from "@/app/[locale]/_lib/display-preference";
import { getCurrentUser } from "@/auth";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchLatestUserTranslationJob } from "../_db/queries.server";
import { fetchPageCommentsCount } from "../_db/queries.server";

type Overrides = {
	displayMode?: DisplayMode | null;
};

export const fetchPageContext = cache(
	async (slug: string, locale: string, overrides: Overrides) => {
		const currentUser = await getCurrentUser();

		const pageDetail = await fetchPageDetail(slug, locale, currentUser?.id);

		if (!pageDetail || pageDetail.status === "ARCHIVE") {
			return notFound();
		}
		const serverDefaultMode = decideFromLocales(
			locale,
			pageDetail.sourceLocale,
		);
		const resolvedDisplayMode: DisplayMode =
			overrides.displayMode ?? serverDefaultMode;

		/* -------- タイトル決定 -------- */
		const titleSegment = pageDetail.segmentBundles.find(
			(b) => b.segment.number === 0,
		);
		if (!titleSegment) return null;

		const title =
			resolvedDisplayMode === "bilingual"
				? `${titleSegment.segment.text} - ${titleSegment.best?.text ?? ""}`
				: resolvedDisplayMode === "source-only"
					? titleSegment.segment.text
					: (titleSegment.best?.text ?? titleSegment.segment.text);

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
			resolvedDisplayMode,
		};
	},
);
