"use client";

import { DeletePageDialog } from "@/app/[locale]/components/delete-page-dialog/delete-page-dialog";
import { PageActionsDropdown } from "@/app/[locale]/components/page-actions-dropdown/page-actions-dropdown";
import { PaginationBar } from "@/app/[locale]/components/pagination-bar";
import { NavigationLink } from "@/components/navigation-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { PageStatus } from "@prisma/client";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import type { PageWithTitle } from "../types";

interface PageManagementTabProps {
	pagesWithTitle: PageWithTitle[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function PageManagementTab({
	pagesWithTitle,
	totalPages,
	currentPage,
	handle,
}: PageManagementTabProps) {
	const [selectedPages, setSelectedPages] = useState<number[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
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
	const [isDeleting, setIsDeleting] = useState(false);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSelectAll = (checked: boolean) => {
		setSelectedPages(checked ? pagesWithTitle.map((p) => p.id) : []);
	};

	const handleSelectPage = (pageId: number, checked: boolean) => {
		setSelectedPages((prev) =>
			checked ? [...prev, pageId] : prev.filter((id) => id !== pageId),
		);
	};

	const getStatusBadge = (status: PageStatus) => {
		if (status === "PUBLIC") {
			return <Badge variant="default">Published</Badge>;
		}
		return <Badge variant="outline">Private</Badge>;
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
				<div className="w-full py-2 flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => setSelectedPages([])}
						disabled={selectedPages.length === 0 || isDeleting}
					>
						Clear Selection ({selectedPages.length})
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							setDialogOpen(true);
						}}
						disabled={selectedPages.length === 0 || isDeleting}
					>
						{isDeleting ? "Deleting..." : "Delete Selected"}
					</Button>
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<Checkbox
									checked={selectedPages.length === pagesWithTitle.length}
									onCheckedChange={handleSelectAll}
									disabled={isDeleting}
								/>
							</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Last Modified</TableHead>
							<TableHead className="w-10">f</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pagesWithTitle.map((pageWithTitle) => (
							<TableRow key={pageWithTitle.id}>
								<TableCell>
									<Checkbox
										checked={selectedPages.includes(pageWithTitle.id)}
										onCheckedChange={(checked) =>
											handleSelectPage(pageWithTitle.id, checked as boolean)
										}
										disabled={isDeleting}
									/>
								</TableCell>
								<TableCell className="font-medium">
									<NavigationLink
										href={`/user/${handle}/page/${pageWithTitle.slug}`}
									>
										{pageWithTitle.title}
									</NavigationLink>
								</TableCell>
								<TableCell>{getStatusBadge(pageWithTitle.status)}</TableCell>
								<TableCell>{pageWithTitle.updatedAt}</TableCell>
								<TableCell>
									<PageActionsDropdown
										editPath={`/user/${handle}/page/${pageWithTitle.slug}/edit`}
										pageId={pageWithTitle.id}
										status={pageWithTitle.status}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<DeletePageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				pageIds={selectedPages}
			/>

			<div className="flex justify-center mt-4">
				<PaginationBar
					totalPages={totalPages}
					currentPage={currentPage}
					onPageChange={handlePageChange}
				/>
			</div>
		</div>
	);
}
