import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { SortTabs } from "@/app/[locale]/(common-layout)/_components/sort-tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
const DynamicUserInfo = dynamic<{ handle: string }>(
	() =>
		import("@/app/[locale]/(common-layout)/_components/user-info.server").then(
			(mod) => mod.UserInfo,
		),
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

export default async function UserPage(
	props: PageProps<"/[locale]/user/[handle]">,
): Promise<React.ReactNode> {
	const { handle, locale } = await props.params;
	const { sort, page } = await loadSearchParams(props.searchParams);
	return (
		<>
			<DynamicUserInfo handle={handle} />
			<SortTabs defaultSort={sort} />
			<DynamicPageList
				handle={handle}
				locale={locale}
				page={page}
				showPagination={true}
				sort={sort}
			/>
			<FloatingControls />
		</>
	);
}
