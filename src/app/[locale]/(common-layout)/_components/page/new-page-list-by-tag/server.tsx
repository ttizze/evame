import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { Fragment } from "react";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list.client";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list.server";
import { PageListContainer } from "@/app/[locale]/(common-layout)/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import {
	fetchPaginatedPublicNewestPageListsByTag,
	fetchPaginatedPublicNewestPageListsByTagForTopPage,
	fetchPublicNewestPageListsByTagsForTopPage,
} from "./_db/queries.server";

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

interface TagPageListSectionProps {
	locale: string;
	tagName: string;
	pageForLists: PageForList[];
	currentPage: number;
	totalPages: number;
	showPagination: boolean;
}

function TagPageListSection({
	locale,
	tagName,
	pageForLists,
	currentPage,
	totalPages,
	showPagination,
}: TagPageListSectionProps) {
	if (pageForLists.length === 0) {
		return null;
	}

	return (
		<PageListContainer icon={SparklesIcon} title={`${tagName}`}>
			<PageLikeListClient pageIds={pageForLists.map((p) => p.id)} />
			{pageForLists.map((PageForList, index) => (
				<PageList
					index={index}
					key={PageForList.id}
					locale={locale}
					PageForList={PageForList}
				/>
			))}
			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}
		</PageListContainer>
	);
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
		<TagPageListSection
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
					<TagPageListSection
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
