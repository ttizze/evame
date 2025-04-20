import { SortTabs } from "@/app/[locale]/_components/sort-tabs";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { FloatingControls } from "@/app/[locale]/_components/floating-controls.client";
const DynamicCommonTabs = dynamic(
	() =>
		import("@/app/[locale]/_components/common-tabs").then(
			(mod) => mod.CommonTabs,
		),
	{
		loading: () => <Skeleton className="h-[50px] w-full mb-4" />,
	},
);

const DynamicUserProjectList = dynamic(
	() =>
		import("./_components/user-project-list.server").then(
			(mod) => mod.UserProjectList,
		),
	{
		loading: () => <Skeleton className="h-[200px] w-full mb-4" />,
	},
);

const DynamicPageList = dynamic(
	() =>
		import("./_components/user-page-list.server").then(
			(mod) => mod.PageListServer,
		),
	{
		loading: () => (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
			</div>
		),
	},
);
const DynamicUserInfo = dynamic(
	() =>
		import("../../../_components/user-info.server").then((mod) => mod.UserInfo),
	{
		loading: () => <Skeleton className="h-[200px] w-full mb-4" />,
	},
);

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
	const { handle } = await params;
	if (!handle) {
		return notFound();
	}
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}
	return { title: pageOwner.name };
}
const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	tab: parseAsString.withDefault("home"),
	sort: parseAsString.withDefault("popular"),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function UserPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string; handle: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const { locale, handle } = await params;
	const { page, query, tab, sort } = await loadSearchParams(searchParams);
	const MoreButtonClass = "rounded-full w-1/2 md:w-1/3";
	return (
		<>
			<DynamicUserInfo handle={handle} />
			<DynamicCommonTabs defaultTab={tab}>
				{tab === "home" && (
					<div className="space-y-8">
						<DynamicUserProjectList
							handle={handle}
							page={1}
							locale={locale}
							sort={sort}
						/>
						<div className="flex justify-center w-full mt-4">
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
						<DynamicPageList
							handle={handle}
							page={1}
							locale={locale}
							sort={sort}
						/>
						<div className="flex justify-center w-full mt-4">
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
					</div>
				)}
				{tab === "projects" && (
					<>
						<SortTabs defaultSort={sort} />
						<DynamicUserProjectList
							handle={handle}
							page={page}
							locale={locale}
							sort={sort}
						/>
					</>
				)}
				{tab === "pages" && (
					<>
						<SortTabs defaultSort={sort} />
						<DynamicPageList
							handle={handle}
							page={page}
							locale={locale}
							sort={sort}
							showPagination={true}
						/>
					</>
				)}
			</DynamicCommonTabs>
			<FloatingControls />
		</>
	);
}
