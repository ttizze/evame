"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { WrapSegmentClient } from "@/app/[locale]/_components/wrap-segments/client";
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
					<WrapSegmentClient
						bundle={titleSegment}
						currentHandle={parent.user.handle}
						interactive={false}
						tagName="span"
						tagProps={{
							className: "line-clamp-1 break-all overflow-wrap-anywhere",
						}}
					>
						{titleSegment.segment.text}
					</WrapSegmentClient>
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
				<ChevronRight
					className={cn("h-5 w-5 transition-transform", isOpen && "rotate-90")}
				/>
				<Link className="hover:underline" href={pageLink}>
					{titleSegment && (
						<WrapSegmentClient
							bundle={titleSegment}
							currentHandle={parent.user.handle}
							interactive={false}
							tagName="span"
							tagProps={{
								className: "line-clamp-1 break-all overflow-wrap-anywhere",
							}}
						>
							{titleSegment.segment.text}
						</WrapSegmentClient>
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
