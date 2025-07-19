"use client";

import { useState } from "react";
import useSWR from "swr";
import type { PageSummary } from "@/app/[locale]/types";

interface Props {
	parent: PageSummary;
	locale: string;
}

export function ChildPageTree({ parent, locale }: Props) {
	const [open, setOpen] = useState(false);
	const hasChildrenKnown =
		parent._count?.children && parent._count.children > 0;

	const fetcher = (url: string) =>
		fetch(url).then((res) => res.json() as Promise<PageSummary[]>);

	const { data: children } = useSWR<PageSummary[]>(
		open && hasChildrenKnown
			? `/api/child-pages?parentId=${parent.id}&locale=${locale}`
			: null,
		fetcher,
		{
			revalidateOnFocus: false,
			fallbackData: parent.children ?? undefined,
		},
	);

	if (!hasChildrenKnown) {
		return (
			<a
				className="hover:underline"
				href={`/${locale}/user/${parent.user.handle}/page/${parent.slug}`}
			>
				{parent.segmentBundles?.[0]?.segment?.text || "Untitled"}
			</a>
		);
	}

	return (
		<details className="group" onToggle={(e) => setOpen(e.currentTarget.open)}>
			<summary className="cursor-pointer list-none flex items-center gap-1">
				<span className="transition-transform group-open:rotate-90">▶</span>
				<a
					className="hover:underline"
					href={`/${locale}/user/${parent.user.handle}/page/${parent.slug}`}
				>
					{parent.segmentBundles?.[0]?.segment?.text || "Untitled"}
				</a>
			</summary>
			{children && (
				<ul className="ml-4 space-y-1 list-none">
					{children.map((child) => (
						<li key={child.id}>
							<ChildPageTree locale={locale} parent={child} />
						</li>
					))}
				</ul>
			)}
		</details>
	);
}
