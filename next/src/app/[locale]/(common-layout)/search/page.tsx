import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { fetchSearchResults } from "./_db/queries.server";
import { CATEGORIES, type Category } from "./constants";
import { SearchResults } from "./search-results.server";
import { SearchPageClient } from "./search.client";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	category: parseAsString.withDefault("title"),
	tagPage: parseAsString.withDefault("false"),
};

const loadSearchParams = createLoader(searchParamsSchema);

export default async function SearchPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const { locale } = await params;
	const { page, query, category, tagPage } =
		await loadSearchParams(searchParams);

	// 型安全性を確保
	const validCategory: Category = CATEGORIES.includes(category as Category)
		? (category as Category)
		: "title";

	const { pageSummaries, tags, users, totalPages } = await fetchSearchResults({
		query,
		category: validCategory,
		page,
		locale,
		tagPage,
	});

	return (
		<main>
			<div className="max-w-screen-xl mx-auto py-6">
				<SearchPageClient />
				{query && (
					<div className="container mx-auto px-4">
						<SearchResults
							pageSummaries={pageSummaries}
							tags={tags}
							users={users}
							totalPages={totalPages}
							currentCategory={validCategory}
							currentPage={page}
							locale={locale}
						/>
					</div>
				)}
			</div>
		</main>
	);
}
