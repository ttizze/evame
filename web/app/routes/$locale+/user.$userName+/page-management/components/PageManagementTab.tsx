import { useSearchParams } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { LocaleLink } from "~/components/LocaleLink";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/ui/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { DeletePageDialog } from "../../components/DeletePageDialog";
import { PageActionsDropdown } from "../../components/PageActionsDropdown";
import type { PageWithTitle } from "../types";
interface PageManagementTabProps {
	pagesWithTitle: PageWithTitle[];
	totalPages: number;
	currentPage: number;
	userName: string;
}

export function PageManagementTab({
	pagesWithTitle,
	totalPages,
	currentPage,
	userName,
}: PageManagementTabProps) {
	const [selectedPages, setSelectedPages] = useState<number[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [searchParams, setSearchParams] = useSearchParams();
	const [dialogOpen, setDialogOpen] = useState(false);
	const fetcher = useFetcher();

	useEffect(() => {
		const searchFromParams = searchParams.get("search") || "";
		setSearchTerm(searchFromParams);
	}, [searchParams]);

	useEffect(() => {
		const timer = setTimeout(() => {
			const currentSearch = searchParams.get("search") || "";
			if (searchTerm !== currentSearch) {
				setSearchParams(
					(prev) => {
						const newParams = new URLSearchParams(prev);
						if (searchTerm) {
							newParams.set("search", searchTerm);
						} else {
							newParams.delete("search");
						}
						newParams.set("page", "1");
						return newParams;
					},
					{ replace: true },
				);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm, setSearchParams, searchParams]);

	const handlePageChange = (newPage: number) => {
		setSearchParams(
			(prev) => {
				const newParams = new URLSearchParams(prev);
				newParams.set("page", newPage.toString());
				return newParams;
			},
			{ replace: true },
		);
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedPages(pagesWithTitle.map((pageWithTitle) => pageWithTitle.id));
		} else {
			setSelectedPages([]);
		}
	};

	const handleSelectPage = (pageId: number, checked: boolean) => {
		if (checked) {
			setSelectedPages((prev) => [...prev, pageId]);
		} else {
			setSelectedPages((prev) => prev.filter((id) => id !== pageId));
		}
	};

	const handleDelete = () => {
		fetcher.submit(
			{ intent: "archive", pageIds: selectedPages.join(",") },
			{ method: "post" },
		);
		setSelectedPages([]);
		setDialogOpen(false);
	};

	const handleTogglePublic = (pageId: number) => {
		fetcher.submit(
			{ intent: "togglePublic", pageId: pageId.toString() },
			{ method: "post" },
		);
	};

	const getStatusBadge = (isPublished: boolean) => {
		if (isPublished) {
			return <Badge variant="default">Published</Badge>;
		}
		return <Badge variant="outline">Private</Badge>;
	};

	const isDeleting = fetcher.state !== "idle";

	return (
		<div className="space-y-4">
			<div className="">
				<Input
					placeholder="Search pages..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
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
									<LocaleLink
										to={`/user/${userName}/page/${pageWithTitle.slug}`}
									>
										{pageWithTitle.title}
									</LocaleLink>
								</TableCell>
								<TableCell>
									{getStatusBadge(pageWithTitle.isPublished)}
								</TableCell>
								<TableCell>{pageWithTitle.updatedAt}</TableCell>
								<TableCell>
									<PageActionsDropdown
										editPath={`/user/${userName}/page/${pageWithTitle.slug}/edit`}
										onTogglePublic={() => handleTogglePublic(pageWithTitle.id)}
										onDelete={() => {
											setSelectedPages([pageWithTitle.id]);
											setDialogOpen(true);
										}}
										isPublished={pageWithTitle.isPublished}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="flex justify-center mt-4">
				<Pagination>
					<PaginationContent>
						{currentPage > 1 && (
							<PaginationItem>
								<PaginationPrevious
									onClick={() => handlePageChange(currentPage - 1)}
								/>
							</PaginationItem>
						)}
						{Array.from({ length: totalPages }, (_, i) => i + 1).map(
							(pageNum) => (
								<PaginationItem key={pageNum}>
									<PaginationLink
										onClick={() => handlePageChange(pageNum)}
										isActive={pageNum === currentPage}
									>
										{pageNum}
									</PaginationLink>
								</PaginationItem>
							),
						)}
						{currentPage < totalPages && (
							<PaginationItem>
								<PaginationNext
									onClick={() => handlePageChange(currentPage + 1)}
								/>
							</PaginationItem>
						)}
					</PaginationContent>
				</Pagination>
			</div>

			<DeletePageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={handleDelete}
			/>
		</div>
	);
}
