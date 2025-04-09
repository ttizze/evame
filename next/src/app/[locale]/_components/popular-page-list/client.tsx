"use client";

import { PageList } from "@/app/[locale]/_components/page-list";
import type { PageWithRelationsType } from "@/app/[locale]/_db/queries.server";
import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";
import { PaginationBar } from "../pagination-bar";
interface PopularPageListClientProps {
	pagesWithRelations: PageWithRelationsType[];
	totalPages: number;
	locale: string;
}

export function PopularPageListClient({
	pagesWithRelations,
	totalPages,
	locale,
}: PopularPageListClientProps) {
	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	);

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				{pagesWithRelations.map((pageWithRelations, index) => (
					<PageList
						key={pageWithRelations.id}
						pageWithRelations={pageWithRelations}
						pageLink={`/user/${pageWithRelations.user.handle}/page/${pageWithRelations.slug}`}
						userLink={`/user/${pageWithRelations.user.handle}`}
						index={index}
					/>
				))}
			</div>

			{/* ページネーション */}
			<div className="mt-8 flex justify-center">
				<PaginationBar totalPages={totalPages} currentPage={page} />
			</div>
		</div>
	);
}
