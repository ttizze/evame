import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { EyeIcon } from "lucide-react";
import { archivePageAction } from "@/app/[locale]/(common-layout)/_components/page/delete-page-dialog/action";
import { togglePublishAction } from "@/app/[locale]/(common-layout)/_components/page/page-actions-dropdown/action";
import { PageActionsDropdown } from "@/app/[locale]/(common-layout)/_components/page/page-actions-dropdown/client";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PageWithTitle } from "../../_db/queries.server";

export function PageManagementTabClient({
	pagesWithTitle,
	totalPages,
	currentPage,
	handle,
	locale,
	query,
	pageViewCounts,
	onQueryChange,
}: {
	pagesWithTitle: PageWithTitle[];
	totalPages: number;
	currentPage: number;
	handle: string;
	locale: string;
	query: string;
	pageViewCounts: Record<number, number>;
	onQueryChange: (query: string) => void;
}) {
	const { pathname, searchStr } = useLocation();
	const router = useRouter();
	const publish = useServerFn(togglePublishAction);
	const archive = useServerFn(archivePageAction);
	return (
		<div className="space-y-4">
			<Input
				aria-label="Search pages"
				className="w-full"
				onChange={(event) => onQueryChange(event.target.value)}
				placeholder="Search pages..."
				value={query}
			/>

			<div className="rounded-md">
				{pagesWithTitle.map((page) => (
					<div className="flex justify-between border-b py-2" key={page.id}>
						<div>
							<Link
								params={{ handle, locale, pageSlug: page.slug }}
								to="/$locale/$handle/$pageSlug"
							>
								{page.title}
							</Link>
							<div className="mt-2 flex gap-2">
								{page.status === "PUBLIC" ? (
									<Badge
										className="text-center whitespace-nowrap"
										variant="default"
									>
										Public
									</Badge>
								) : (
									<Badge
										className="text-center whitespace-nowrap"
										variant="outline"
									>
										Private
									</Badge>
								)}
								{page.updatedAt}
								<div className="flex gap-2">
									<div className="flex items-center gap-1">
										<EyeIcon className="h-4 w-4" />
										{pageViewCounts[page.id] ?? 0}
									</div>
								</div>
							</div>
						</div>
						<PageActionsDropdown
							archive={() => archive({ data: { locale, pageId: page.id } })}
							handle={handle}
							locale={locale}
							onUpdated={() => void router.invalidate({ sync: true })}
							pageSlug={page.slug}
							publish={() => publish({ data: { locale, pageId: page.id } })}
							status={page.status}
						/>
					</div>
				))}
			</div>

			<div className="mt-4 flex justify-center">
				<PaginationBar
					currentPage={currentPage}
					pathname={pathname}
					search={searchStr}
					totalPages={totalPages}
				/>
			</div>
		</div>
	);
}
