import { getCurrentUser } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsString } from "nuqs/server";
const DynamicCommonTabs = dynamic(
	() =>
		import("@/app/[locale]/_components/common-tabs").then(
			(mod) => mod.CommonTabs,
		),
	{
		loading: () => <Skeleton className="h-[50px] w-full mb-4" />,
	},
);

const PopularProjectList = dynamic(
	() =>
		import("@/app/[locale]/_components/project/popular-project-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const NewProjectList = dynamic(
	() => import("@/app/[locale]/_components/project/new-project-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

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
	const { tab, sort } = await loadSearchParams(searchParams);
	const MoreButtonClass = "rounded-full w-1/2 md:w-1/3";
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
			<DynamicCommonTabs defaultTab={tab}>
				{tab === "home" && (
					<div className="space-y-12">
						<section>
							<NewPageList locale={locale} searchParams={searchParams} />
							<div className="flex justify-center w-full mt-6">
								<Button
									variant="default"
									size="default"
									asChild
									className={MoreButtonClass}
								>
									<Link
										href={"?tab=pages&sort=new"}
										className="gap-1 flex items-center justify-center"
									>
										View more
										<ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							</div>
						</section>
						<section>
							<NewProjectList locale={locale} searchParams={searchParams} />
							<div className="flex justify-center w-full mt-6">
								<Button
									variant="default"
									size="default"
									asChild
									className={MoreButtonClass}
								>
									<Link
										href={"?tab=projects&sort=new"}
										className="gap-1 flex items-center justify-center"
									>
										View more
										<ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							</div>
						</section>

						<section>
							<PopularPageList locale={locale} searchParams={searchParams} />
							<div className="flex justify-center w-full mt-6">
								<Button
									variant="default"
									size="default"
									asChild
									className={MoreButtonClass}
								>
									<Link
										href={"?tab=pages&sort=popular"}
										className="gap-1 flex items-center justify-center"
									>
										View more
										<ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							</div>
						</section>

						<section>
							<PopularProjectList locale={locale} searchParams={searchParams} />
							<div className="flex justify-center w-full mt-6">
								<Button
									variant="default"
									size="default"
									asChild
									className={MoreButtonClass}
								>
									<Link
										href={"?tab=projects&sort=popular"}
										className="gap-1 flex items-center justify-center"
									>
										View more
										<ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							</div>
						</section>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<section>
								<h2 className="text-2xl font-bold mb-4">Popular Tags</h2>
								<Card className="rounded-lg p-4 shadow-xs">
									<PopularPageTagsList limit={10} />
								</Card>
							</section>
							<section>
								<h2 className="text-2xl font-bold mb-4">Popular Users</h2>
								<Card className="rounded-lg p-4 shadow-xs">
									<PopularUsersList limit={5} />
								</Card>
							</section>
						</div>
					</div>
				)}
				{tab === "projects" && (
					<>
						<SortTabs defaultSort={sort} />
						{sort === "popular" ? (
							<PopularProjectList
								locale={locale}
								searchParams={searchParams}
								showPagination
							/>
						) : (
							<NewProjectList
								locale={locale}
								searchParams={searchParams}
								showPagination
							/>
						)}
					</>
				)}
				{tab === "pages" && (
					<>
						<SortTabs defaultSort={sort} />
						{sort === "popular" ? (
							<PopularPageList
								locale={locale}
								searchParams={searchParams}
								showPagination
							/>
						) : (
							<NewPageList
								locale={locale}
								searchParams={searchParams}
								showPagination
							/>
						)}
					</>
				)}
			</DynamicCommonTabs>
		</div>
	);
}
