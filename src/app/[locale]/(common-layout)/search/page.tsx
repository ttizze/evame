import { ClientOnly } from "@tanstack/react-router";
import type { ScriptureListItem } from "@/components/scripture/types";
import { CATEGORIES, type Category, getSearchCopy } from "./constants";
import { SearchPageClient } from "./search.client";
import { SearchResults } from "./search-results";

export default function SearchPage({
	locale,
	query,
	category,
	results,
}: {
	locale: string;
	query: string;
	category: Category;
	results: ScriptureListItem[];
}) {
	const validCategory = CATEGORIES.includes(category) ? category : "title";
	const copy = getSearchCopy(locale);

	return (
		<section className="mx-auto max-w-5xl py-6">
			<h1 className="mb-6 text-2xl font-semibold">{copy.title}</h1>
			<ClientOnly fallback={null}>
				<SearchPageClient
					category={validCategory}
					locale={locale}
					query={query}
				/>
			</ClientOnly>
			{query ? (
				<SearchResults locale={locale} query={query} results={results} />
			) : null}
		</section>
	);
}
