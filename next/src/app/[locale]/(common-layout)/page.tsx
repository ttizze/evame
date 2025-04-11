import { getCurrentUser } from "@/auth";
import type { SearchParams } from "nuqs/server";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
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
	() => import("@/app/[locale]/_components/popular-project-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const NewProjectList = dynamic(
	() => import("@/app/[locale]/_components/new-project-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const PopularPageList = dynamic(
	() => import("@/app/[locale]/_components/popular-page-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const NewPageList = dynamic(
	() => import("@/app/[locale]/_components/new-page-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const HeroSection = dynamic(
	() => import("@/app/[locale]/_components/hero-section/server"),
	{
		loading: () => <Skeleton className="h-[770px] w-full mb-10" />,
	},
);

const SortTabs = dynamic(
	() =>
		import("@/app/[locale]/_components/sort-tabs").then((mod) => mod.SortTabs),
	{
		loading: () => <Skeleton className="h-[50px] w-full mb-4" />,
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
	const { tab, sort } = await loadSearchParams(searchParams);

	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			{!currentUser && <HeroSection locale={locale} />}
			<DynamicCommonTabs defaultTab={tab}>
				{tab === "home" && (
					<div className="space-y-8">
						<PopularProjectList
							handle={currentUser?.handle ?? ""}
							page={1}
							query={""}
						/>
						<div className="flex justify-center w-full mt-4">
							<Button
								variant="default"
								size="default"
								asChild
								className="rounded-full w-1/2 md:w-1/3"
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
						<PopularPageList
							locale={locale}
							currentUserId={currentUser?.id ?? ""}
							searchParams={searchParams}
						/>
						<div className="flex justify-center w-full mt-4">
							<Button
								variant="default"
								size="default"
								asChild
								className="rounded-full w-1/2 md:w-1/3"
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
						<NewProjectList
							handle={currentUser?.handle ?? ""}
							page={1}
							query={""}
						/>
						<div className="flex justify-center w-full mt-4">
							<Button
								variant="default"
								size="default"
								asChild
								className="rounded-full w-1/2 md:w-1/3"
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
						<NewPageList
							locale={locale}
							currentUserId={currentUser?.id ?? ""}
							searchParams={searchParams}
						/>
						<div className="flex justify-center w-full mt-4">
							<Button
								variant="default"
								size="default"
								asChild
								className="rounded-full w-1/2 md:w-1/3"
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
					</div>
				)}
				{tab === "projects" && (
					<>
						<SortTabs defaultSort={sort} />
						{sort === "popular" ? (
							<PopularProjectList
								handle={currentUser?.handle ?? ""}
								page={1}
								query={""}
							/>
						) : (
							<NewProjectList
								handle={currentUser?.handle ?? ""}
								page={1}
								query={""}
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
								currentUserId={currentUser?.id ?? ""}
								searchParams={searchParams}
							/>
						) : (
							<NewPageList
								locale={locale}
								currentUserId={currentUser?.id ?? ""}
								searchParams={searchParams}
							/>
						)}
					</>
				)}
			</DynamicCommonTabs>
		</div>
	);
}
