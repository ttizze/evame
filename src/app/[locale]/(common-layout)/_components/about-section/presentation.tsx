import type { ReactNode } from "react";
import type { fetchSocialProofStats } from "./_db/social-proof-stats.server";
import ComparisonSection from "./components/comparison-section";
import FAQSection from "./components/faq-section";
import ReachFeature from "./components/features/reach";
import ReadFeature from "./components/features/read";
import RefineFeature from "./components/features/refine";
import WriteFeature from "./components/features/write";
import FinalCTA from "./components/final-cta";
import FounderSection from "./components/founder-section";
import HeroSection from "./components/hero-section";
import ProblemSection from "./components/problem-section";
import SocialProofBar from "./components/social-proof-bar";
import type { fetchAboutPage } from "./service/fetch-about-page";

export default function AboutSectionPresentation({
	locale,
	pageDetail,
	stats,
	readControls,
	floatingControls,
}: {
	locale: string;
	pageDetail: Awaited<ReturnType<typeof fetchAboutPage>>;
	stats: Awaited<ReturnType<typeof fetchSocialProofStats>>;
	readControls: ReactNode;
	floatingControls: ReactNode;
}) {
	return (
		<div className="about-section flex flex-col space-y-16 md:space-y-24">
			<HeroSection pageDetail={pageDetail} />
			<SocialProofBar locale={locale} pageDetail={pageDetail} stats={stats} />
			<FounderSection pageDetail={pageDetail} />
			<ProblemSection pageDetail={pageDetail} />
			<WriteFeature pageDetail={pageDetail} />
			<ReachFeature pageDetail={pageDetail} />
			<RefineFeature locale={locale} pageDetail={pageDetail} />
			<ReadFeature
				controls={readControls}
				locale={locale}
				pageDetail={pageDetail}
			/>
			<ComparisonSection pageDetail={pageDetail} />
			<FAQSection pageDetail={pageDetail} />
			<FinalCTA pageDetail={pageDetail} />
			{floatingControls}
		</div>
	);
}
