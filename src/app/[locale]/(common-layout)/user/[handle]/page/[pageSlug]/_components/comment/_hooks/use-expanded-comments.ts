"use client";

import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import { useTransition } from "react";
import { COMMENT_EXPANDED_IDS_KEY } from "../_constants/query-keys";

/**
 * Centralized hook to manage expanded comment IDs via the URL query param.
 */
export function useExpandedComments() {
	const [isPending, startTransition] = useTransition();
	const [expandedIds, setExpandedIds] = useQueryState(
		COMMENT_EXPANDED_IDS_KEY,
		parseAsArrayOf(parseAsInteger)
			.withDefault([])
			.withOptions({ shallow: false, startTransition }),
	);

	return { expandedIds, setExpandedIds, isPending } as const;
}
