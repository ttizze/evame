import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsString } from "nuqs/server";

const PopularPageList = dynamic(
	() => import("@/app/[locale]/_components/page/popular-page-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const PopularPageTagsList = dynamic(
	() => import("@/app/[locale]/_components/page/popular-page-tags-list/server"),
	{
		loading: () => <Skeleton className="h-[100px] w-full mb-6" />,
	},
);

const NewPageList = dynamic(
	() => import("@/app/[locale]/_components/page/new-page-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const SortTabs = dynamic(
	() =>
		import("@/app/[locale]/_components/sort-tabs").then((mod) => mod.SortTabs),
	{
		loading: () => <Skeleton className="h-[50px] w-full mb-4" />,
	},
);
const PopularUsersList = dynamic(
	() => import("@/app/[locale]/_components/user/popular-users-list/server"),
	{
		loading: () => <Skeleton className="h-[200px] w-full mb-6" />,
	},
);
const DynamicHeroSection = dynamic(
	() => import("@/app/[locale]/_components/hero-section/server"),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

const DynamicProblemSolutionSection = dynamic(
	() =>
		import(
			"@/app/[locale]/_components/top-page/problem-solution-section/server"
		),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

const DynamicControl = dynamic(
	() =>
		import("@/app/[locale]/_components/top-page/top-page-control.server").then(
			(mod) => mod.default,
		),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);
import { StartButton } from "@/app/[locale]/_components/start-button";

const PopularPageListByTag = dynamic(
	() =>
		import("@/app/[locale]/_components/page/popular-page-list-by-tag/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

export const metadata: Metadata = {
	title: "Evame - Home - Latest Pages",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

const searchParamsSchema = {
	tab: parseAsString.withDefault("home"),
	sort: parseAsString.withDefault("popular"),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function HomePage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const currentUser = await getCurrentUser();
	const { locale } = await params;
	const { sort } = await loadSearchParams(searchParams);
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			{!currentUser && (
				<>
					<DynamicHeroSection locale={locale} />
					<DynamicProblemSolutionSection locale={locale} />
					<div className="mb-32 flex justify-center mt-10">
						<StartButton className="w-60 h-12 text-xl" text="Get Started" />
					</div>
				</>
			)}
			<DynamicControl />
			<>
				<PopularPageListByTag locale={locale} tagName="AI" />
				<PopularPageListByTag locale={locale} tagName="Programming" />
				<PopularPageListByTag locale={locale} tagName="Plurality" />
				<SortTabs defaultSort={sort} />
				{sort === "popular" ? (
					<>
						<PopularPageList
							locale={locale}
							searchParams={searchParams}
							showPagination
						/>
					</>
				) : (
					<NewPageList
						locale={locale}
						searchParams={searchParams}
						showPagination
					/>
				)}
			</>
		</div>
	);
}
