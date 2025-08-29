"use client";

import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import { useTransition } from "react";
import { COMMENT_EXPANDED_IDS_KEY } from "../_constants/query-keys";

/**
 * Centralized hook to manage expanded comment IDs via the URL query param.
 */
export function useExpandedComments() {
	const [isPending, startTransition] = useTransition();
	const [_, setExpandedIds] = useQueryState(
		COMMENT_EXPANDED_IDS_KEY,
		parseAsArrayOf(parseAsInteger)
			.withDefault([])
			.withOptions({ shallow: false, startTransition }),
	);
	const toggleExpandedId = (id: number) =>
		setExpandedIds((prev) => {
			const set = new Set(prev ?? []);
			if (set.has(id)) set.delete(id);
			else set.add(id);
			return Array.from(set).sort((a, b) => a - b);
		});
	return {
		toggleExpandedId,
		isPending,
	} as const;
}
