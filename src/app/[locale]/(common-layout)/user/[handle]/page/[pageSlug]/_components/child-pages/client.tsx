"use client";

import { WrapSegmentClient } from "@/app/[locale]/_components/wrap-segments/client";
import type { PageForList } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

interface Props {
	parent: PageForList;
	locale: string;
}

interface PageLinkProps {
	page: PageForList;
	titleSegment: PageForList["segmentBundles"][0];
	className?: string;
}

// カスタムフック: 子ページの取得
function useChildPages(parent: PageForList, locale: string, isOpen: boolean) {
	const hasChildren = parent._count?.children && parent._count.children > 0;

	return useSWR<PageForList[]>(
		isOpen && hasChildren
			? `/api/child-pages?parentId=${parent.id}&locale=${locale}`
			: null,
		(url: string) => fetch(url).then((res) => res.json()),
		{
			revalidateOnFocus: false,
			fallbackData: undefined,
		},
	);
}

// ページリンクコンポーネント（重複を削除）
function PageLink({ page, titleSegment, className }: PageLinkProps) {
	const pageLink = `/user/${page.user.handle}/page/${page.slug}`;

	return (
		<Link className={cn("block overflow-hidden", className)} href={pageLink}>
			<WrapSegmentClient
				bundle={titleSegment}
				currentHandle={page.user.handle}
				interactive={false}
				tagName="span"
				tagProps={{
					className: "line-clamp-1 break-all overflow-wrap-anywhere",
				}}
			>
				{titleSegment.segment.text}
			</WrapSegmentClient>
		</Link>
	);
}

// 子ページリストコンポーネント
function ChildPageList({
	childPages,
	locale,
}: {
	childPages: PageForList[];
	locale: string;
}) {
	return (
		<ul className="ml-4 space-y-1 list-none">
			{childPages.map((child) => (
				<li key={child.id}>
					<ChildPageTree locale={locale} parent={child} />
				</li>
			))}
		</ul>
	);
}

export function ChildPageTree({ parent, locale }: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const { data: children } = useChildPages(parent, locale, isOpen);

	// タイトルセグメントの取得
	const titleSegment = parent.segmentBundles.find(
		(s) => s.segment.number === 0,
	);

	// 早期リターン: タイトルセグメントが存在しない場合
	if (!titleSegment) {
		return null;
	}

	const hasChildren = Boolean(
		parent._count?.children && parent._count.children > 0,
	);

	// 子ページがない場合は単純なリンクとして表示
	if (!hasChildren) {
		return <PageLink page={parent} titleSegment={titleSegment} />;
	}

	// 子ページがある場合は展開可能なツリーとして表示
	return (
		<details
			className="group"
			onToggle={(e) => setIsOpen(e.currentTarget.open)}
		>
			<summary className="cursor-pointer list-none flex items-center gap-1">
				<ChevronRight
					className={cn("h-5 w-5 transition-transform", isOpen && "rotate-90")}
				/>
				<PageLink
					className="hover:underline"
					page={parent}
					titleSegment={titleSegment}
				/>
			</summary>
			{children && <ChildPageList childPages={children} locale={locale} />}
		</details>
	);
}
