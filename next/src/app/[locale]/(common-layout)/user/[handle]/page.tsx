import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { UserProjectList } from "./_components/user-project-list/server";
const PageList = dynamic(
	() =>
		import("./_components/page-list.server").then((mod) => mod.PageListServer),
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
const UserInfo = dynamic(
	() => import("./_components/user-info.server").then((mod) => mod.UserInfo),
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
	const { page, query } = await loadSearchParams(searchParams);
	const currentUser = await getCurrentUser();

	return (
		<>
			<UserInfo handle={handle} />
			<UserProjectList
				currentUserId={currentUser?.id ?? ""}
				page={page}
				query={query}
			/>
			<PageList handle={handle} page={page} locale={locale} />
		</>
	);
}
