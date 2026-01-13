import { getCurrentUser } from "@/lib/auth-server";
import { StartButton } from "../../_components/start-button";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import HeroSection from "./hero-section/server";
import ProblemSolutionSection from "./problem-solution-section/server";
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
		<div className="flex flex-col">
			<HeroSection locale={locale} />
			<ProblemSolutionSection locale={locale} />
			<div className="mb-32 flex justify-center mt-10">
				<StartButton className="w-60 h-12 text-xl" text="Get Started" />
			</div>
			<FloatingControls sourceLocale="mixed" userLocale={locale} />
		</div>
	);
}
