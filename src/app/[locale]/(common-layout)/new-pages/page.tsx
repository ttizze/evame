import type { Metadata } from "next";
import { createLoader, parseAsInteger } from "nuqs/server";
import type React from "react";
import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list.server";
import { getNewPagesMetadata } from "./metadata";
import { NewPagesPresentation } from "./presentation";

const loadSearchParams = createLoader({
	page: parseAsInteger.withDefault(1),
});

export async function generateMetadata(
	props: PageProps<"/[locale]/new-pages">,
): Promise<Metadata> {
	const { locale } = await props.params;
	return getNewPagesMetadata(locale);
}

export default async function NewPagesPage(
	props: PageProps<"/[locale]/new-pages">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	const { page } = await loadSearchParams(props.searchParams);
	const data = await fetchPaginatedNewPageLists({
		locale,
		page,
		pageSize: 5,
	});

	return <NewPagesPresentation data={data} locale={locale} page={page} />;
}
