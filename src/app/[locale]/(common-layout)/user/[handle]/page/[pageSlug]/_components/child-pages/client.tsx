"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTitle, SegmentForList } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface Props {
	parent: PageForTitle;
	locale: string;
}

interface PageLinkProps {
	page: PageForTitle;
	titleSegment: SegmentForList;
	className?: string;
}

// カスタムフック: 子ページの取得
function useChildPages(parent: PageForTitle, locale: string, isOpen: boolean) {
	const hasChildren = parent._count?.children && parent._count.children > 0;

	return useSWR<PageForTitle[]>(
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
			<SegmentElement
				className="line-clamp-1 break-all overflow-wrap-anywhere"
				interactive={false}
				segment={titleSegment}
				tagName="span"
			/>
		</Link>
	);
}

// 子ページリストコンポーネント
function ChildPageList({
	childPages,
	locale,
}: {
	childPages: PageForTitle[];
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
	const titleSegment = parent.content.segments.find((s) => s.number === 0);

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
