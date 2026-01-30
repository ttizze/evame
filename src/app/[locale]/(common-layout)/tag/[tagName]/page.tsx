import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type React from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { Skeleton } from "@/components/ui/skeleton";

const NewPageListByTag = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/server"
		),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

export async function generateMetadata(
	props: PageProps<"/[locale]/tag/[tagName]">,
): Promise<Metadata> {
	const { locale, tagName } = await props.params;
	const decodedTagName = decodeURIComponent(tagName);
	const title = `${decodedTagName} | Evame`;
	const description = `Browse the latest articles tagged with "${decodedTagName}" on Evame. Discover multilingual content from writers worldwide.`;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, `/tag/${tagName}`),
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
