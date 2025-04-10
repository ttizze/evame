"use client";

import { Input } from "@/components/ui/input";
import { parseAsString, useQueryState } from "nuqs";

interface SearchInputProps {
	initialQuery: string;
}

export function SearchInput({ initialQuery }: SearchInputProps) {
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
		}),
	);

	return (
		<Input
			placeholder="Search projects..."
			value={query || initialQuery || ""}
			onChange={(e) => setQuery(e.target.value)}
			className="max-w-md"
		/>
	);
}
