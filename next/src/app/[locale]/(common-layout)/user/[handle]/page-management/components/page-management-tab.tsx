"use client";

import { PageActionsDropdown } from "@/app/[locale]/components/page-actions-dropdown/client";
import { PaginationBar } from "@/app/[locale]/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import type { PageStatus } from "@prisma/client";
import { EyeIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import type { PageWithTitleAndViewData } from "../db/queries.server";
interface PageManagementTabProps {
	pagesWithTitleAndViewData: PageWithTitleAndViewData[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function PageManagementTab({
	pagesWithTitleAndViewData,
	totalPages,
	currentPage,
	handle,
}: PageManagementTabProps) {
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
		}),
	);
	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withOptions({
			shallow: false,
		}),
	);

	const getStatusBadge = (status: PageStatus) => {
		if (status === "PUBLIC") {
			return (
				<Badge variant="default" className="w-16 text-center">
					Public
				</Badge>
			);
		}
		return (
			<Badge variant="outline" className="w-16 text-center">
				Private
			</Badge>
		);
	};

	return (
		<div className="space-y-4">
			<div className="">
				<Input
					placeholder="Search pages..."
					value={query || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full"
				/>
			</div>

			<div className="rounded-md ">
				{pagesWithTitleAndViewData.map((pageWithTitleAndViewData) => (
					<div
						key={pageWithTitleAndViewData.id}
						className="flex border-b py-2 justify-between"
					>
						<div>
							<Link
								href={`/user/${handle}/page/${pageWithTitleAndViewData.slug}`}
							>
								{pageWithTitleAndViewData.title}
							</Link>
							<div className="flex gap-2 mt-2">
								{getStatusBadge(pageWithTitleAndViewData.status)}
								{pageWithTitleAndViewData.updatedAt}
								<div className="flex gap-2">
									<div className="flex items-center gap-1">
										<EyeIcon className="w-4 h-4" />
										{pageWithTitleAndViewData.viewCount}
									</div>
								</div>
							</div>
						</div>
						<PageActionsDropdown
							editPath={`/user/${handle}/page/${pageWithTitleAndViewData.slug}/edit`}
							pageId={pageWithTitleAndViewData.id}
							status={pageWithTitleAndViewData.status}
						/>
					</div>
				))}
			</div>

			<div className="flex justify-center mt-4">
				<PaginationBar
					totalPages={totalPages}
					currentPage={currentPage}
					onPageChange={setPage}
				/>
			</div>
		</div>
	);
}
