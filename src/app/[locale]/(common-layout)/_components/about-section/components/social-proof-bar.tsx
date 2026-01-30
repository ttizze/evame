import { sql } from "kysely";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { db } from "@/db";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import type { PageStatus } from "@/db/types";
import { fetchAboutPage } from "../service/fetch-about-page";

const LANGUAGE_COUNT = 18;

async function fetchSocialProofStats() {
	const articlesResult = await db
		.selectFrom("pages")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("status", "=", "PUBLIC" satisfies PageStatus)
		.where("parentId", "is", null)
		.executeTakeFirst();

	const translationsResult = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("pages.status", "=", "PUBLIC" satisfies PageStatus)
		.where("pages.parentId", "is", null)
		.executeTakeFirst();

	return {
		articles: Number(articlesResult?.count ?? 0),
		translations: Number(translationsResult?.count ?? 0),
		languages: LANGUAGE_COUNT,
	};
}

export default async function SocialProofBar({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const articlesLabel = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.socialProofArticles,
	);
	const translationsLabel = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.socialProofTranslations,
	);
	const languagesLabel = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.socialProofLanguages,
	);

	if (!articlesLabel || !translationsLabel || !languagesLabel) {
		return null;
	}

	const stats = await fetchSocialProofStats();
	const formatNumber = new Intl.NumberFormat(locale);

	return (
		<section className="py-10 md:py-12">
			<div className="mx-auto max-w-5xl px-6">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 text-center">
					<div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm backdrop-blur-sm">
						<p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
							{formatNumber.format(stats.articles)}
						</p>
						<SegmentElement
							className="text-xs md:text-sm tracking-wide"
							segment={articlesLabel}
							tagName="span"
						/>
					</div>
					<div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm backdrop-blur-sm">
						<p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
							{formatNumber.format(stats.translations)}
						</p>
						<SegmentElement
							className="text-xs md:text-sm tracking-wide"
							segment={translationsLabel}
							tagName="span"
						/>
					</div>
					<div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm backdrop-blur-sm">
						<p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
							{formatNumber.format(stats.languages)}
						</p>
						<SegmentElement
							className="text-xs md:text-sm tracking-wide"
							segment={languagesLabel}
							tagName="span"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
