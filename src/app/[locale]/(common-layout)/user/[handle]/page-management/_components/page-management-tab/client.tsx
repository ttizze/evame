"use client";

import { EyeIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { PageActionsDropdown } from "@/app/[locale]/(common-layout)/_components/page/page-actions-dropdown/client";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Pagestatus } from "@/db/types";
import { Link } from "@/i18n/routing";
import type { PageWithTitle } from "../../_db/queries.server";

interface PageManagementTabClientProps {
	pagesWithTitle: PageWithTitle[];
	totalPages: number;
	currentPage: number;
	handle: string;
	pageViewCounters: Record<string, ReactNode>;
}

export function PageManagementTabClient({
	pagesWithTitle,
	totalPages,
	currentPage,
	handle,
	pageViewCounters,
}: PageManagementTabClientProps) {
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
		}),
	);

	const getStatusBadge = (status: Pagestatus) => {
		if (status === "PUBLIC") {
			return (
				<Badge className="w-16 text-center" variant="default">
					Public
				</Badge>
			);
		}
		return (
			<Badge className="w-16 text-center" variant="outline">
				Private
			</Badge>
		);
	};

	return (
		<div className="space-y-4">
			<div className="">
				<Input
					className="w-full"
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search pages..."
					value={query || ""}
				/>
			</div>

			<div className="rounded-md">
				{pagesWithTitle.map((page) => (
					<div className="flex border-b py-2 justify-between" key={page.id}>
						<div>
							{/* Draft/private pages should open preview for owners */}
							<Link
								href={
									page.status === "PUBLIC"
										? `/user/${handle}/page/${page.slug}`
										: `/user/${handle}/page/${page.slug}/preview`
								}
							>
								{page.title}
							</Link>
							<div className="flex gap-2 mt-2">
								{getStatusBadge(page.status)}
								{page.updatedAt}
								<div className="flex gap-2">
									<div className="flex items-center gap-1">
										<EyeIcon className="w-4 h-4" />
										{pageViewCounters[page.id]}
									</div>
								</div>
							</div>
						</div>
						<PageActionsDropdown
							editPath={`/user/${handle}/page/${page.slug}/edit`}
							pageId={page.id}
							status={page.status}
						/>
					</div>
				))}
			</div>

			<div className="flex justify-center mt-4">
				<PaginationBar currentPage={currentPage} totalPages={totalPages} />
			</div>
		</div>
	);
}
