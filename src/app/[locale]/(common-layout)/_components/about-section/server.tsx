import ComparisonSection from "./components/comparison-section";
import FAQSection from "./components/faq-section";
import ReachFeature from "./components/features/reach";
import ReadFeature from "./components/features/read";
import RefineFeature from "./components/features/refine";
import FinalCTA from "./components/final-cta";
import FounderSection from "./components/founder-section";
import HeroSection from "./components/hero-section/server";
import ProblemSection from "./components/problem-section";
import SocialProofBar from "./components/social-proof-bar";

export default function AboutSection({
	locale,
	topPage,
}: {
	locale: string;
	topPage: boolean;
}) {
	return (
		<div
			className="about-section flex flex-col space-y-16 md:space-y-24"
			data-top-page={topPage ? "true" : "false"}
		>
			<h1 className="sr-only">About</h1>
			<HeroSection locale={locale} />
			<SocialProofBar locale={locale} />
			<FounderSection locale={locale} />
			<ProblemSection locale={locale} />
			<ReachFeature locale={locale} />
			<RefineFeature locale={locale} />
			<ReadFeature locale={locale} />
			<ComparisonSection locale={locale} />
			<FAQSection locale={locale} />
			<FinalCTA locale={locale} />
		</div>
	);
}
