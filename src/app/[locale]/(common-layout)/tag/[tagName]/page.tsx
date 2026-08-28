import type { Metadata } from "next";
import { createLoader, parseAsInteger } from "nuqs/server";
import type React from "react";
import { fetchPaginatedPublicNewestPageListsByTag } from "@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/_db/queries";
import { getTagMetadata } from "./metadata";
import { TagPagesPresentation } from "./presentation";

const loadSearchParams = createLoader({
	page: parseAsInteger.withDefault(1),
});

export async function generateMetadata(
	props: PageProps<"/[locale]/tag/[tagName]">,
): Promise<Metadata> {
	const { locale, tagName } = await props.params;
	return getTagMetadata(locale, tagName);
}

export default async function TagNewPagesPage(
	props: PageProps<"/[locale]/tag/[tagName]">,
): Promise<React.ReactNode> {
	const { locale, tagName } = await props.params;
	const { page } = await loadSearchParams(props.searchParams);
	const data = await fetchPaginatedPublicNewestPageListsByTag({
		locale,
		page,
		pageSize: 5,
		tagName,
	});

	return (
		<TagPagesPresentation
			data={data}
			locale={locale}
			page={page}
			tagName={tagName}
		/>
	);
}
