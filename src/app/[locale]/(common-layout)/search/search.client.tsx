"use client";

import { Edit3, FileText, Hash, User } from "lucide-react";
import Form from "next/form";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useTransition } from "react";
import {
	CATEGORIES,
	type Category,
} from "@/app/[locale]/(common-layout)/search/constants";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SearchPageClient() {
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

	const [, setPageNumber] = useQueryState(
		"page",
		parseAsInteger.withDefault(1).withOptions({
			shallow: false,
			startTransition,
		}),
	);

	function handleTabChange(newCat: Category) {
		setCurrentCategory(newCat);
		setPageNumber(1);
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
		<div className="">
			<Form action="/search" className="mb-6">
				<input type="hidden" name="category" value={currentCategory ?? ""} />
				<div className="relative">
					<Input
						type="search"
						name="query"
						required
						value={query ?? ""}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search..."
						className="w-full px-4 py-3 rounded-full border"
					/>
				</div>
			</Form>

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
			{isPending && <p className="text-gray-400">Loading...</p>}
		</div>
	);
}
