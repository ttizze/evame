import { getCurrentUser } from "@/app/_service/auth-server";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import ComparisonSection from "./components/comparison-section";
import FAQSection from "./components/faq-section";
import ReachFeature from "./components/features/reach";
import ReadFeature from "./components/features/read";
import RefineFeature from "./components/features/refine";
import WriteFeature from "./components/features/write";
import FinalCTA from "./components/final-cta";
import FounderSection from "./components/founder-section";
import HeroSection from "./components/hero-section/server";
import ProblemSection from "./components/problem-section";
import SocialProofBar from "./components/social-proof-bar";

export default async function AboutSection({
	locale,
	topPage,
}: {
	locale: string;
	topPage: boolean;
}) {
	const currentUser = await getCurrentUser();
	if (topPage && currentUser) {
		return <FloatingControls sourceLocale="mixed" userLocale={locale} />;
	}
	return (
		<div className="about-section flex flex-col space-y-16 md:space-y-24">
			<HeroSection locale={locale} />
			<SocialProofBar locale={locale} />
			<FounderSection locale={locale} />
			<ProblemSection locale={locale} />
			<WriteFeature locale={locale} />
			<ReachFeature locale={locale} />
			<RefineFeature locale={locale} />
			<ReadFeature locale={locale} />
			<ComparisonSection locale={locale} />
			<FAQSection locale={locale} />
			<FinalCTA locale={locale} />
			<FloatingControls sourceLocale="mixed" userLocale={locale} />
		</div>
	);
}
