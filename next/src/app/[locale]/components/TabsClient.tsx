"use client";

import { PageCard } from "@/app/[locale]/components/page-card";
import type { PageCardLocalizedType } from "@/app/[locale]/db/queries.server";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";
import { parseAsInteger, parseAsString } from "nuqs";
interface TabsClientProps {
	initialTab: string;
	pagesWithInfo: PageCardLocalizedType[];
	totalPages: number;
	currentPage: number;
	locale: string;
}

export function TabsClient({
	initialTab,
	pagesWithInfo,
	totalPages,
	currentPage,
}: TabsClientProps) {
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsString.withOptions({ shallow: false }),
	);
	const [recommendedPage, setRecommendedPage] = useQueryState(
		"recommendedPage",
		parseAsInteger.withOptions({ shallow: false }),
	);
	const [newPage, setNewPage] = useQueryState(
		"newPage",
		parseAsInteger.withOptions({ shallow: false }),
	);

	const handleTabChange = (value: string) => {
		setTab(value);
	};

	const handlePageChange = (pageNumber: number) => {
		if (initialTab === "recommended") {
			setRecommendedPage(pageNumber);
		} else {
			setNewPage(pageNumber);
		}
	};

	return (
		<div className="container mx-auto px-4">
			<Tabs value={tab ?? initialTab} onValueChange={handleTabChange}>
				<TabsList className="flex justify-center rounded-full mb-4">
					<TabsTrigger value="recommended" className="rounded-full w-1/2">
						Hot🔥
					</TabsTrigger>
					<TabsTrigger value="new" className="rounded-full w-1/2">
						New✨️
					</TabsTrigger>
				</TabsList>

				{/* --- おすすめページタブ --- */}
				<TabsContent value="recommended">
					<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{pagesWithInfo.map((page) => (
							<PageCard
								key={page.id}
								pageCard={page}
								pageLink={`/user/${page.user.handle}/page/${page.slug}`}
								userLink={`/user/${page.user.handle}`}
							/>
						))}
					</div>
					{/* ページネーション */}
					<div className="mt-8 flex justify-center">
						<Pagination className="mt-4">
							<PaginationContent className="w-full justify-between">
								<PaginationItem>
									<PaginationPrevious
										onClick={() => handlePageChange(currentPage - 1)}
										className={
											currentPage === 1 ? "pointer-events-none opacity-50" : ""
										}
									/>
								</PaginationItem>
								<div className="flex items-center space-x-2">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(
										(pageNumber) => {
											if (
												pageNumber === 1 ||
												pageNumber === totalPages ||
												(pageNumber >= currentPage - 1 &&
													pageNumber <= currentPage + 1)
											) {
												return (
													<PaginationItem key={`page-${pageNumber}`}>
														<PaginationLink
															onClick={() => handlePageChange(pageNumber)}
															isActive={currentPage === pageNumber}
														>
															{pageNumber}
														</PaginationLink>
													</PaginationItem>
												);
											}
											if (
												pageNumber === currentPage - 2 ||
												pageNumber === currentPage + 2
											) {
												return (
													<PaginationEllipsis key={`ellipsis-${pageNumber}`} />
												);
											}
											return null;
										},
									)}
								</div>
								<PaginationItem>
									<PaginationNext
										onClick={() => handlePageChange(currentPage + 1)}
										className={
											currentPage === totalPages
												? "pointer-events-none opacity-50"
												: ""
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</TabsContent>

				{/* --- 新着ページタブ --- */}
				<TabsContent value="new">
					<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{pagesWithInfo.map((page) => (
							<PageCard
								key={page.id}
								pageCard={page}
								pageLink={`/user/${page.user.handle}/page/${page.slug}`}
								userLink={`/user/${page.user.handle}`}
							/>
						))}
					</div>
					{/* ページネーション */}
					<div className="mt-8 flex justify-center">
						<Pagination className="mt-4">
							<PaginationContent className="w-full justify-between">
								<PaginationItem>
									<PaginationPrevious
										onClick={() => handlePageChange(currentPage - 1)}
										className={
											currentPage === 1 ? "pointer-events-none opacity-50" : ""
										}
									/>
								</PaginationItem>
								<div className="flex items-center space-x-2">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(
										(pageNumber) => {
											if (
												pageNumber === 1 ||
												pageNumber === totalPages ||
												(pageNumber >= currentPage - 1 &&
													pageNumber <= currentPage + 1)
											) {
												return (
													<PaginationItem key={`page-${pageNumber}`}>
														<PaginationLink
															onClick={() => handlePageChange(pageNumber)}
															isActive={currentPage === pageNumber}
														>
															{pageNumber}
														</PaginationLink>
													</PaginationItem>
												);
											}
											if (
												pageNumber === currentPage - 2 ||
												pageNumber === currentPage + 2
											) {
												return (
													<PaginationEllipsis key={`ellipsis-${pageNumber}`} />
												);
											}
											return null;
										},
									)}
								</div>
								<PaginationItem>
									<PaginationNext
										onClick={() => handlePageChange(currentPage + 1)}
										className={
											currentPage === totalPages
												? "pointer-events-none opacity-50"
												: ""
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
