"use client";

import { useState } from "react";
import useSWR from "swr";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { PageSummary } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface Props {
	parent: PageSummary;
	locale: string;
}

const fetcher = (url: string) =>
	fetch(url).then((res) => res.json() as Promise<PageSummary[]>);

export function ChildPageTree({ parent, locale }: Props) {
	const [isOpen, setIsOpen] = useState(false);

	const hasChildren = Boolean(
		parent._count?.children && parent._count.children > 0,
	);
	const pageLink = `/user/${parent.user.handle}/page/${parent.slug}`;
	const titleSegment = parent.segmentBundles.find(
		(s) => s.segment.number === 0,
	);
	const { data: children } = useSWR<PageSummary[]>(
		isOpen && hasChildren
			? `/api/child-pages?parentId=${parent.id}&locale=${locale}`
			: null,
		fetcher,
		{
			revalidateOnFocus: false,
			fallbackData: parent.children ?? undefined,
		},
	);

	if (!hasChildren) {
		return (
			<Link className="block overflow-hidden" href={pageLink}>
				{titleSegment && (
					<SegmentAndTranslationSection
						currentHandle={parent.user.handle}
						interactive={false}
						segmentBundle={titleSegment}
						segmentTextClassName="line-clamp-1 break-all overflow-wrap-anywhere"
					/>
				)}
			</Link>
		);
	}

	return (
		<details
			className="group"
			onToggle={(e) => setIsOpen(e.currentTarget.open)}
		>
			<summary className="cursor-pointer list-none flex items-center gap-1">
				<span
					className={cn(
						"transition-transform self-start pt-0.5",
						isOpen && "rotate-90",
					)}
				>
					▶
				</span>
				<Link className="hover:underline" href={pageLink}>
					{titleSegment && (
						<SegmentAndTranslationSection
							currentHandle={parent.user.handle}
							interactive={false}
							segmentBundle={titleSegment}
							segmentTextClassName="line-clamp-1 break-all overflow-wrap-anywhere"
						/>
					)}
				</Link>
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
