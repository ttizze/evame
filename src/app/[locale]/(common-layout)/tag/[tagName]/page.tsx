import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type { SearchParams } from "nuqs/server";
import { Skeleton } from "@/components/ui/skeleton";

const NewPageListByTag = dynamic(
	() => import("@/app/[locale]/_components/page/new-page-list-by-tag/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

interface TagPageProps {
	params: Promise<{ locale: string; tagName: string }>;
	searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
	params,
}: TagPageProps): Promise<Metadata> {
	const { tagName } = await params;
	return {
		title: `Evame - New Pages – ${tagName}`,
		description: `Browse the latest pages tagged with ${tagName} on Evame.`,
	};
}

export default async function TagNewPagesPage({
	params,
	searchParams,
}: TagPageProps) {
	const { locale, tagName } = await params;
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageListByTag
				locale={locale}
				searchParams={searchParams}
				showPagination={true}
				tagName={tagName}
			/>
		</div>
	);
}
