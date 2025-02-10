"use client";

import type { SanitizedUser } from "@/app/types";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tag } from "@prisma/client";
import { Edit3, FileText, Hash, User } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useTransition } from "react";
import { PageCard } from "@/app/[locale]/components/page-card";
import { PaginationBar } from "@/app/[locale]/components/pagination-bar";
import { TagList } from "@/app/[locale]/components/tag-list";
import type { PageCardLocalizedType } from "@/app/[locale]/db/queries.server";
import { CATEGORIES, type Category } from "@/app/[locale]/(common-layout)/search/constants";

interface Props {
	pages: PageCardLocalizedType[] | undefined;
	tags: Tag[] | undefined;
	users: SanitizedUser[] | undefined;
	totalPages: number;
}

export function SearchPageClient({ pages, tags, users, totalPages }: Props) {
	const [isPending, startTransition] = useTransition();
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
			startTransition,
		}),
	);
	const [currentCategory, setCurrentCategory] = useQueryState(
		"category",
		parseAsString.withDefault("title").withOptions({
			shallow: false,
			startTransition,
		}),
	);

	const [pageNumber, setPageNumber] = useQueryState(
		"page",
		parseAsInteger.withOptions({
			shallow: false,
			startTransition,
		}),
	);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const newQuery = formData.get("query")?.toString() ?? "";
		const category = formData.get("category")?.toString() ?? "title";

		setQuery(newQuery);
		setCurrentCategory(category);
		setPageNumber(1);
	}

	function handleTabChange(newCat: Category) {
		setCurrentCategory(newCat);
		setPageNumber(1);
	}

	function handlePageChange(newPage: number) {
		setPageNumber(newPage);
	}

	function renderIcon(cat: Category) {
		switch (cat) {
			case "title":
				return <FileText className="mr-1 h-4 w-4" />;
			case "user":
				return <User className="mr-1 h-4 w-4" />;
			case "tags":
				return <Hash className="mr-1 h-4 w-4" />;
			case "content":
				return <Edit3 className="mr-1 h-4 w-4" />;
			default:
				return null;
		}
	}

	return (
		<div className="container mx-auto p-4">
			<form method="get" className="mb-6" onSubmit={handleSubmit}>
				<input type="hidden" name="category" value={currentCategory ?? ""} />
				<div className="relative">
					<Input
						type="search"
						name="query"
						required
						defaultValue={query ?? ""}
						placeholder="Search..."
						className="w-full px-4 py-3 rounded-full border"
					/>
				</div>
			</form>

			<Tabs
				value={currentCategory ?? ""}
				onValueChange={(val) => {
					handleTabChange(val as Category);
				}}
			>
				<TabsList className="mb-6 border-b w-full flex rounded-full">
					{CATEGORIES.map((cat) => (
						<TabsTrigger
							key={cat}
							value={cat}
							className="flex-1 items-center justify-center rounded-full text-sm"
						>
							{renderIcon(cat)}
							{cat.charAt(0).toUpperCase() + cat.slice(1)}
						</TabsTrigger>
					))}
				</TabsList>
				{CATEGORIES.map((cat) => (
					<TabsContent key={cat} value={cat} />
				))}
			</Tabs>
			{isPending ? (
				<p className="text-gray-400">Loading...</p>
			) : (
				<div className="space-y-4">
					{(currentCategory === "title" || currentCategory === "content") &&
						pages?.length === 0 && (
							<p className="text-gray-500">No results found.</p>
						)}
					{currentCategory === "tags" && tags?.length === 0 && (
						<p className="text-gray-500">No results found.</p>
					)}
					{currentCategory === "user" && users?.length === 0 && (
						<p className="text-gray-500">No results found.</p>
					)}

					{currentCategory === "tags" && tags?.length && tags.length > 0 && (
						<TagList tag={tags} />
					)}
					{currentCategory === "tags" && pages?.length && pages.length > 0 && (
						<div className="space-y-4">
							{pages.map((p) => (
								<PageCard
									key={p.id}
									pageCard={p}
									pageLink={`/user/${p.user.handle}/page/${p.slug}`}
									userLink={`/user/${p.user.handle}`}
								/>
							))}
						</div>
					)}

					{currentCategory === "user" && users?.length && users.length > 0 && (
						<div className="space-y-4">
							{users.map((usr) => (
								<div
									key={usr.handle}
									className="flex items-start p-4 rounded-lg"
								>
									<div className="flex-1">
										<a href={`/user/${usr.handle}`}>
											<h3 className="text-xl font-bold">{usr.name}</h3>
											<span className="text-gray-500 text-sm">
												@{usr.handle}
											</span>
										</a>
									</div>
								</div>
							))}
						</div>
					)}

					{(currentCategory === "title" || currentCategory === "content") &&
						pages?.length &&
						pages.length > 0 && (
							<div className="space-y-4">
								{pages.map((p) => (
									<PageCard
										key={p.id}
										pageCard={p}
										pageLink={`/user/${p.user.handle}/page/${p.slug}`}
										userLink={`/user/${p.user.handle}`}
									/>
								))}
							</div>
						)}
				</div>
			)}
			{totalPages > 1 && (
				<div className="mt-4 flex items-center gap-4">
					<PaginationBar
						totalPages={totalPages}
						currentPage={pageNumber ?? 1}
						onPageChange={handlePageChange}
					/>
				</div>
			)}
		</div>
	);
}
