import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const NewPageList = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list/server"
		),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

export const metadata: Metadata = {
	title: "Evame - New Pages",
	description: "Browse the latest pages on Evame.",
};

export default async function NewPagesPage(
	props: PageProps<"/[locale]/new-pages">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageList
				locale={locale}
				searchParams={props.searchParams}
				showPagination={true}
			/>
		</div>
	);
}
