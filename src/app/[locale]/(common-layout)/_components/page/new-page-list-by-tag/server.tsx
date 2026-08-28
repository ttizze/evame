import { ArrowRightIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { fetchPaginatedPublicNewestPageListsByTag } from "./_db/queries";
import {
	fetchPaginatedPublicNewestPageListsByTagForTopPage,
	fetchPublicNewestPageListsByTagsForTopPage,
} from "./_db/queries.server";
import { NewPageListByTagPresentation } from "./presentation";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface NewPageListByTagProps {
	locale: string;
	tagName: string;
	/**
	 * Forward request searchParams for pagination when needed.
	 * Optional because we may render without pagination.
	 */
	searchParams?: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function NewPageListByTag({
	locale,
	tagName,
	searchParams,
	showPagination = false,
}: NewPageListByTagProps) {
	const { page } = searchParams
		? await loadSearchParams(searchParams)
		: { page: 1 };

	const { pageForLists, totalPages } = showPagination
		? await fetchPaginatedPublicNewestPageListsByTag({
				tagName,
				page,
				pageSize: 5,
				locale,
			})
		: await fetchPaginatedPublicNewestPageListsByTagForTopPage({
				tagName,
				page,
				pageSize: 5,
				locale,
			});

	return (
		<NewPageListByTagPresentation
			currentPage={page}
			locale={locale}
			pageForLists={pageForLists}
			showPagination={showPagination}
			tagName={tagName}
			totalPages={totalPages}
		/>
	);
}

interface NewPageListByTagsProps {
	locale: string;
	tagNames: string[];
	pageSize?: number;
}

export async function NewPageListByTags({
	locale,
	tagNames,
	pageSize = 5,
}: NewPageListByTagsProps) {
	const tagPageLists = await fetchPublicNewestPageListsByTagsForTopPage({
		tagNames,
		pageSize,
		locale,
	});

	return (
		<>
			{tagPageLists.map(({ tagName, pageForLists }) => (
				<Fragment key={tagName}>
					<NewPageListByTagPresentation
						currentPage={1}
						locale={locale}
						pageForLists={pageForLists}
						showPagination={false}
						tagName={tagName}
						totalPages={1}
					/>
					<div className="flex justify-center">
						<Button className="rounded-full w-40 h-10" variant="default">
							<Link
								className="flex items-center gap-2"
								href={`/tag/${tagName}`}
							>
								More <ArrowRightIcon className="w-4 h-4" />
							</Link>
						</Button>
					</div>
				</Fragment>
			))}
		</>
	);
}
