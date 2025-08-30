"use client";

import useSWR from "swr";

type PageViewCounterProps = {
	pageId: number;
	initialCount: number;
	className?: string;
};

export function PageViewCounter({
	pageId,
	initialCount,
	className = "text-muted-foreground",
}: PageViewCounterProps) {
	const fetcher = (url: string) =>
		fetch(url, {
			method: "POST",
			credentials: "include",
			keepalive: true,
			headers: { "Content-Type": "application/json" },
		})
			.then((r) => {
				if (!r.ok) throw new Error("failed");
				return r.json() as Promise<{ count?: number }>;
			})
			.then((data) =>
				typeof data.count === "number" ? data.count : initialCount,
			);

	const { data: count } = useSWR<number>(
		`/api/page-views/${pageId}/increment`,
		fetcher,
		{
			// Avoid accidental multiple increments via focus/reconnect refreshes
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			refreshInterval: 0,
			// Show initial server-rendered count until API responds
			fallbackData: initialCount,
		},
	);

	return <span className={className}>{count}</span>;
}
