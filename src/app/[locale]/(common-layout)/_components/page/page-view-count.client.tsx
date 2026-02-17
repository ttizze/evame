"use client";

import useSWR from "swr";

type PageViewCountProps = {
	pageId: number;
	initialCount: number;
	className?: string;
	batchPageIds?: number[];
};

type PageViewCountsResponse = {
	counts: Record<string, number>;
};

function buildQueryKey(batchPageIds: number[] | undefined): string | null {
	if (!batchPageIds || batchPageIds.length === 0) {
		return null;
	}

	const ids = Array.from(
		new Set(batchPageIds.filter((id) => Number.isInteger(id) && id > 0)),
	).sort((a, b) => a - b);

	if (ids.length === 0) {
		return null;
	}

	return `/api/page-views?ids=${ids.join(",")}`;
}

export function PageViewCount({
	pageId,
	initialCount,
	className = "text-muted-foreground",
	batchPageIds,
}: PageViewCountProps) {
	const { data } = useSWR<PageViewCountsResponse>(
		buildQueryKey(batchPageIds),
		(url) =>
			fetch(url)
				.then((response) => {
					if (!response.ok) {
						throw new Error("failed to fetch page views");
					}
					return response.json() as Promise<PageViewCountsResponse>;
				})
				.catch(() => ({ counts: {} })),
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			refreshInterval: 0,
		},
	);

	const nextCount = data?.counts?.[String(pageId)];
	const count = typeof nextCount === "number" ? nextCount : initialCount;

	return <span className={className}>{count}</span>;
}
