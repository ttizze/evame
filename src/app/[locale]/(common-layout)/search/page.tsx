import type { Metadata } from "next";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type React from "react";
import { fetchSearchResults } from "./_db/queries";
import { CATEGORIES, type Category } from "./constants";
import { getSearchMetadata } from "./metadata";
import { SearchPagePresentation } from "./presentation";

export async function generateMetadata(
	props: PageProps<"/[locale]/search">,
): Promise<Metadata> {
	const { locale } = await props.params;
	return getSearchMetadata(locale);
}

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	category: parseAsString.withDefault("title"),
	tagPage: parseAsString.withDefault("false"),
};

const loadSearchParams = createLoader(searchParamsSchema);

export default async function SearchPage(
	props: PageProps<"/[locale]/search">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	const { page, query, category, tagPage } = await loadSearchParams(
		props.searchParams,
	);

	const validCategory: Category = CATEGORIES.includes(category as Category)
		? (category as Category)
		: "title";
	const validPage = page > 0 ? page : 1;
	const validTagPage = tagPage === "true" ? "true" : "false";

	const data = await fetchSearchResults({
		query,
		category: validCategory,
		page: validPage,
		locale,
		tagPage: validTagPage,
	});

	return (
		<SearchPagePresentation
			category={validCategory}
			data={data}
			locale={locale}
			page={validPage}
			query={query}
		/>
	);
}
