import { fetchUserByHandle } from "@/app/db/queries.server";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
const PageList = dynamic(
	() =>
		import("./components/page-list.server").then((mod) => mod.PageListServer),
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
	() => import("./components/user-info.server").then((mod) => mod.UserInfo),
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
	const { page } = await loadSearchParams(searchParams);

	return (
		<>
			<UserInfo handle={handle} />
			<PageList handle={handle} page={page} locale={locale} />
		</>
	);
}
