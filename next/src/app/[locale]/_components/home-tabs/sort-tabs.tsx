"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";

interface SortTabsProps {
	defaultSort?: string;
}

export function SortTabs({ defaultSort = "popular" }: SortTabsProps) {
	const [sort, setSort] = useQueryState("sort", {
		defaultValue: defaultSort,
		shallow: false,
	});

	return (
		<div className="my-4 flex justify-center">
			<Tabs value={sort} onValueChange={setSort} className="w-11/12">
				<TabsList className="h-9 w-full flex justify-center bg-muted/50 rounded-full">
					<TabsTrigger
						value="popular"
						className="px-3 text-xs w-1/2 rounded-full"
					>
						Popular
					</TabsTrigger>
					<TabsTrigger value="new" className="px-3 text-xs w-1/2 rounded-full">
						New
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
