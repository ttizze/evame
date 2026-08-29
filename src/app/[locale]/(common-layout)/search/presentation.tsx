import type { SearchResultsData } from "./_db/queries";
import type { Category } from "./constants";
import { SearchPageClient } from "./search";
import { SearchResults } from "./search-results";

export function SearchPagePresentation({
	category,
	data,
	locale,
	page,
	query,
}: {
	category: Category;
	data: SearchResultsData;
	locale: string;
	page: number;
	query: string;
}) {
	return (
		<main>
			<div className="max-w-(--breakpoint-xl) mx-auto py-6">
				<SearchPageClient locale={locale} />
				{query && (
					<div className="">
						<SearchResults
							currentCategory={category}
							currentPage={page}
							locale={locale}
							pageSummaries={data.pageSummaries}
							tags={data.tags}
							totalPages={data.totalPages}
							users={data.users}
						/>
					</div>
				)}
			</div>
		</main>
	);
}
