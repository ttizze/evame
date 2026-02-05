import { getCurrentUser } from "@/app/_service/auth-server";
import { serverLogger } from "@/app/_service/logger.server";
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

const perfLogger = serverLogger.child({ scope: "about-section" });
const isPerfLogEnabled = process.env.PERF_LOG === "1";

export default async function AboutSection({
	locale,
	topPage,
}: {
	locale: string;
	topPage: boolean;
}) {
	let currentUser = null;
	if (isPerfLogEnabled) {
		const start = performance.now();
		currentUser = await getCurrentUser();
		perfLogger.info(
			{
				event: "getCurrentUser",
				locale,
				topPage,
				durationMs: Math.round(performance.now() - start),
			},
			"perf",
		);
	} else {
		currentUser = await getCurrentUser();
	}
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
