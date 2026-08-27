"use client";

import { FileText, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Category, getSearchCopy } from "./constants";

export function SearchPageClient({
	locale,
	query,
	category,
}: {
	locale: string;
	query: string;
	category: Category;
}) {
	const copy = getSearchCopy(locale);
	const [value, setValue] = useState(query);

	return (
		<div>
			<form action={`/${locale}/search`} className="mb-6" method="get">
				<input name="category" type="hidden" value={category} />
				<div className="relative">
					<SearchIcon
						aria-hidden="true"
						className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						aria-label={copy.title}
						className="w-full rounded-full border py-3 pl-11 pr-20"
						name="query"
						onChange={(event) => setValue(event.target.value)}
						placeholder={copy.placeholder}
						required
						type="search"
						value={value}
					/>
					<button
						className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10"
						type="submit"
					>
						{copy.searchButton}
					</button>
				</div>
			</form>

			<nav
				aria-label={copy.title}
				className="mb-6 flex w-full rounded-full border p-1"
			>
				{CATEGORIES.map((item) => {
					const label = item === "title" ? copy.titleTab : copy.contentTab;
					const href = `/${locale}/search?category=${item}${query ? `&query=${encodeURIComponent(query)}` : ""}`;
					return (
						<a
							aria-current={item === category ? "page" : undefined}
							className={cn(
								"flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm",
								item === category
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
							href={href}
							key={item}
						>
							<FileText aria-hidden="true" className="h-4 w-4" />
							{label}
						</a>
					);
				})}
			</nav>
		</div>
	);
}
