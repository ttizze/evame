import { getCurrentUser } from "@/app/_service/auth-server";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import ReachFeature from "./components/features/reach";
import ReadFeature from "./components/features/read";
import RefineFeature from "./components/features/refine";
import WriteFeature from "./components/features/write";
import FinalCTA from "./components/final-cta";
import FounderSection from "./components/founder-section";
import HeroSection from "./components/hero-section/server";

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
		<div className="flex flex-col space-y-16 md:space-y-24">
			<HeroSection locale={locale} />
			<FounderSection locale={locale} />
			<WriteFeature locale={locale} />
			<ReachFeature locale={locale} />
			<RefineFeature locale={locale} />
			<ReadFeature locale={locale} />
			<FinalCTA locale={locale} />
			<FloatingControls sourceLocale="mixed" userLocale={locale} />
		</div>
	);
}
