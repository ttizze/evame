import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list.client";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list.server";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser, Tag } from "@/db/types.helpers";
import type { Category } from "./constants";

interface SearchResultsProps {
	pageSummaries: PageForList[] | undefined;
	pageViewCounts: Map<number, number>;
	tags: Tag[] | undefined;
	users: SanitizedUser[] | undefined;
	totalPages: number;
	currentCategory: Category;
	currentPage: number;
	locale: string;
}

export function SearchResults({
	pageSummaries,
	pageViewCounts,
	tags,
	users,
	totalPages,
	currentCategory,
	currentPage,
	locale,
}: SearchResultsProps) {
	return (
		<div>
			<div className="space-y-4">
				{(currentCategory === "title" || currentCategory === "content") &&
					pageSummaries?.length === 0 && (
						<p className="text-gray-500">No results found.</p>
					)}
				{currentCategory === "tags" && tags?.length === 0 && (
					<p className="text-gray-500">No results found.</p>
				)}
				{currentCategory === "user" && users?.length === 0 && (
					<p className="text-gray-500">No results found.</p>
				)}

				{currentCategory === "tags" && tags?.length && tags.length > 0 && (
					<PageTagList tag={tags} />
				)}
				{currentCategory === "tags" &&
					pageSummaries?.length &&
					pageSummaries.length > 0 && (
						<>
							<PageLikeListClient pageIds={pageSummaries.map((p) => p.id)} />
							<div className="space-y-4">
								{pageSummaries.map((p) => (
									<PageList
										key={p.id}
										locale={locale}
										PageForList={p}
										viewCount={pageViewCounts.get(p.id) ?? 0}
									/>
								))}
							</div>
						</>
					)}

				{currentCategory === "user" && users?.length && users.length > 0 && (
					<div className="space-y-4">
						{users.map((usr) => (
							<div className="flex items-start p-4 rounded-lg" key={usr.handle}>
								<div className="flex-1">
									<a href={`/${usr.handle}`}>
										<h3 className="text-xl font-bold">{usr.name}</h3>
										<span className="text-gray-500 text-sm">@{usr.handle}</span>
									</a>
								</div>
							</div>
						))}
					</div>
				)}

				{(currentCategory === "title" || currentCategory === "content") &&
					pageSummaries?.length &&
					pageSummaries.length > 0 && (
						<>
							<PageLikeListClient pageIds={pageSummaries.map((p) => p.id)} />
							<div className="space-y-4">
								{pageSummaries.map((p) => (
									<PageList
										key={p.id}
										locale={locale}
										PageForList={p}
										viewCount={pageViewCounts.get(p.id) ?? 0}
									/>
								))}
							</div>
						</>
					)}
			</div>
			{totalPages > 1 && (
				<div className="mt-4 flex items-center gap-4">
					<PaginationBar currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}
		</div>
	);
}
