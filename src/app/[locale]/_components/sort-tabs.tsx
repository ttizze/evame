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
				<TabsList className=" w-full flex justify-center  rounded-full">
					<TabsTrigger value="popular" className="text-xs w-1/2 rounded-full">
						Popular
					</TabsTrigger>
					<TabsTrigger value="new" className="text-xs w-1/2 rounded-full">
						New
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
