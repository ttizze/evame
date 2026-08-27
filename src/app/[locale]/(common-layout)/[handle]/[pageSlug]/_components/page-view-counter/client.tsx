"use client";

import { useEffect, useState } from "react";
import { incrementPageView } from "@/app/[locale]/_db/page-interactions";

export function PageViewCounter({
	pageId,
	initialCount = 0,
	className = "text-muted-foreground",
}: {
	pageId: number;
	initialCount?: number;
	className?: string;
}) {
	const [count, setCount] = useState(initialCount);

	useEffect(() => {
		let active = true;
		void incrementPageView({ data: { pageId } })
			.then((nextCount) => {
				if (active) setCount(nextCount);
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, [pageId]);

	return <span className={className}>{count}</span>;
}
