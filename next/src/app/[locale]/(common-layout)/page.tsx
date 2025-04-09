import { getCurrentUser } from "@/auth";
import type { SearchParams } from "nuqs/server";

import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
const PopularProjectList = dynamic(
	() => import("@/app/[locale]/_components/popular-project-list/server"),
	{
		loading: () => <Skeleton className="h-[770px] w-full mb-10" />,
	},
);

const HeroSection = dynamic(
	() => import("@/app/[locale]/_components/hero-section/server"),
	{
		loading: () => <Skeleton className="h-[770px] w-full mb-10" />,
	},
);
const PagesListTab = dynamic(
	() => import("@/app/[locale]/_components/popular-page-list/server"),
	{
		loading: () => <Skeleton className="h-[640px] w-full" />,
	},
);

export const metadata: Metadata = {
	title: "Evame - Home - Latest Pages",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

export default async function HomePage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const currentUser = await getCurrentUser();
	const { locale } = await params;

	return (
		<div className="flex flex-col justify-between">
			{!currentUser && <HeroSection locale={locale} />}
			<PopularProjectList
				handle={currentUser?.handle ?? ""}
				page={1}
				query={""}
			/>
			<PagesListTab
				locale={locale}
				currentUserId={currentUser?.id ?? ""}
				searchParams={searchParams}
			/>
		</div>
	);
}
