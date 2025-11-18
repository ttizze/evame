import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const NewPageListByTag = dynamic(
	() => import("@/app/[locale]/_components/page/new-page-list-by-tag/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

export async function generateMetadata(
	props: PageProps<"/[locale]/tag/[tagName]">,
): Promise<Metadata> {
	const { tagName } = await props.params;
	return {
		title: `Evame - New Pages – ${tagName}`,
		description: `Browse the latest pages tagged with ${tagName} on Evame.`,
	};
}

export default async function TagNewPagesPage(
	props: PageProps<"/[locale]/tag/[tagName]">,
): Promise<React.ReactNode> {
	const { locale, tagName } = await props.params;
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageListByTag
				locale={locale}
				searchParams={props.searchParams}
				showPagination={true}
				tagName={tagName}
			/>
		</div>
	);
}
