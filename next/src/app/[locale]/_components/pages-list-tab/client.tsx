"use client";

import { PageCard } from "@/app/[locale]/_components/page-card";
import type { PageCardLocalizedType } from "@/app/[locale]/_db/queries.server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";
import { parseAsInteger, parseAsString } from "nuqs";
import { PaginationBar } from "../pagination-bar";

interface PagesListTabClientProps {
	initialTab: string;
	pagesWithInfo: PageCardLocalizedType[];
	totalPages: number;
	currentPage: number;
	locale: string;
}

export function PagesListTabClient({
	initialTab,
	pagesWithInfo,
	totalPages,
	currentPage,
}: PagesListTabClientProps) {
	const [activeTab, setActiveTab] = useQueryState(
		"activeTab",
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
		setActiveTab(value);
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
			<Tabs value={activeTab ?? initialTab} onValueChange={handleTabChange}>
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
						<PaginationBar
							totalPages={totalPages}
							currentPage={currentPage}
							onPageChange={handlePageChange}
						/>
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
						<PaginationBar
							totalPages={totalPages}
							currentPage={currentPage}
							onPageChange={handlePageChange}
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
