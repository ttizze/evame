import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import type { PagesWithRelations } from "@/app/[locale]/_db/queries.server";
import type { SanitizedUser } from "@/app/types";
import type { Tag } from "@prisma/client";
import type { Category } from "./constants";

interface SearchResultsProps {
	pagesWithRelations: PagesWithRelations[] | undefined;
	tags: Tag[] | undefined;
	users: SanitizedUser[] | undefined;
	totalPages: number;
	currentCategory: Category;
	currentPage: number;
	locale: string;
}

export function SearchResults({
	pagesWithRelations,
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
					pagesWithRelations?.length === 0 && (
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
					pagesWithRelations?.length &&
					pagesWithRelations.length > 0 && (
						<div className="space-y-4">
							{pagesWithRelations.map((p) => (
								<PageList
									key={p.id}
									pageWithRelations={p}
									pageLink={`/user/${p.user.handle}/page/${p.slug}`}
									userLink={`/user/${p.user.handle}`}
									locale={locale}
								/>
							))}
						</div>
					)}

				{currentCategory === "user" && users?.length && users.length > 0 && (
					<div className="space-y-4">
						{users.map((usr) => (
							<div key={usr.handle} className="flex items-start p-4 rounded-lg">
								<div className="flex-1">
									<a href={`/user/${usr.handle}`}>
										<h3 className="text-xl font-bold">{usr.name}</h3>
										<span className="text-gray-500 text-sm">@{usr.handle}</span>
									</a>
								</div>
							</div>
						))}
					</div>
				)}

				{(currentCategory === "title" || currentCategory === "content") &&
					pagesWithRelations?.length &&
					pagesWithRelations.length > 0 && (
						<div className="space-y-4">
							{pagesWithRelations.map((p) => (
								<PageList
									key={p.id}
									pageWithRelations={p}
									pageLink={`/user/${p.user.handle}/page/${p.slug}`}
									userLink={`/user/${p.user.handle}`}
									locale={locale}
								/>
							))}
						</div>
					)}
			</div>
			{totalPages > 1 && (
				<div className="mt-4 flex items-center gap-4">
					<PaginationBar totalPages={totalPages} currentPage={currentPage} />
				</div>
			)}
		</div>
	);
}
