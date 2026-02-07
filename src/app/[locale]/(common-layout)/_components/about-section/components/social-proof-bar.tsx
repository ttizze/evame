import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchSocialProofStats } from "../_db/social-proof-stats.server";
import { fetchAboutPage } from "../service/fetch-about-page";
import { AboutSectionContent } from "./layout";

export default async function SocialProofBar({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const articlesLabel = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.socialProofArticles,
	);
	const translationsLabel = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.socialProofTranslations,
	);
	const languagesLabel = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.socialProofLanguages,
	);

	if (!articlesLabel || !translationsLabel || !languagesLabel) {
		return null;
	}

	const stats = await fetchSocialProofStats();
	const formatNumber = new Intl.NumberFormat(locale);
	const items = [
		{ label: articlesLabel, value: stats.articles },
		{ label: translationsLabel, value: stats.translations },
		{ label: languagesLabel, value: stats.languages },
	];

	return (
		<AboutSectionContent className="py-10 md:py-12">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 text-center">
				{items.map((item) => (
					<div
						className="rounded-2xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm backdrop-blur-sm"
						key={item.label.number}
					>
						<p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
							{formatNumber.format(item.value)}
						</p>
						<SegmentElement
							className="text-xs md:text-sm tracking-wide"
							segment={item.label}
							tagName="span"
						/>
					</div>
				))}
			</div>
		</AboutSectionContent>
	);
}
