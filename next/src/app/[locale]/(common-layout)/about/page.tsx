import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { StartButton } from "../../_components/start-button";

const HeroSection = dynamic(
	() => import("@/app/[locale]/_components/hero-section/server"),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

const ProblemSolutionSection = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/about/problem-solution-section/server"
		),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

const FeatureSection = dynamic(
	() => import("@/app/[locale]/(common-layout)/about/feature-section/server"),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);
export const metadata: Metadata = {
	title: "Evame - About",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

export default async function AboutPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return (
		<div className="flex flex-col">
			<HeroSection locale={locale} />
			<div className="container mx-auto px-4 ">
				<ProblemSolutionSection locale={locale} />
				<FeatureSection locale={locale} />
				<div className="mb-12 flex justify-center mt-10">
					<StartButton className="w-60 h-12 text-xl" />
				</div>
			</div>
		</div>
	);
}
