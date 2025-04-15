"use client";
import { useHeaderScroll } from "@/app/[locale]/_components/header/hooks/use-header-scroll";
import type { PageWithRelations } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ChevronDown, List } from "lucide-react";
import { getImageProps } from "next/image";
import { useState } from "react";
import Toc, { useHasTableOfContents } from "./toc";

export function SubHeader({
	pageWithRelations,
}: {
	pageWithRelations: PageWithRelations;
}) {
	const [isTocOpen, setIsTocOpen] = useState(false);
	const hasTocContent = useHasTableOfContents();

	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

	const renderToc = () => {
		if (!hasTocContent) return null;

		return (
			<>
				<Button
					variant="ghost"
					className={
						"relative bg-background self-end flex items-center gap-1 rounded-full"
					}
					onClick={() => setIsTocOpen(!isTocOpen)}
					title="Table of Contents"
				>
					<List className="h-5 w-5" />
					<div
						className="transition-transform duration-300 ease-in-out"
						style={{ transform: isTocOpen ? "rotate(180deg)" : "rotate(0deg)" }}
					>
						<ChevronDown className="h-4 w-4" />
					</div>
				</Button>

				{isTocOpen && (
					<div
						className={`absolute right-0 top-full mt-2 z-50 bg-background rounded-xl
          px-3 py-4 drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] 
          border border-border animate-in zoom-in-95 duration-200`}
					>
						<Toc onItemClick={() => setIsTocOpen(false)} />
					</div>
				)}
			</>
		);
	};
	const { props } = getImageProps({
		src: pageWithRelations.user.image,
		alt: pageWithRelations.user.name,
		width: 40,
		height: 40,
	});
	return (
		<div ref={headerRef}>
			<div
				className={`transition-all duration-300 z-[999] ${
					!isVisible ? "-translate-y-full" : ""
				}	${isPinned ? "fixed top-0 left-0 right-0  shadow-md" : ""} bg-background py-4`}
			>
				<div
					className={`prose dark:prose-invert sm:prose lg:prose-lg mx-auto 
					flex items-center not-prose justify-between relative ${isPinned ? "px-4" : ""}`}
				>
					<Link
						href={`/user/${pageWithRelations.user.handle}`}
						className="flex items-center mr-2 !no-underline hover:text-gray-700"
					>
						<Avatar className="w-10 h-10 flex-shrink-0 mr-3 ">
							<AvatarImage {...props} />
							<AvatarFallback>
								{pageWithRelations.user.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm">{pageWithRelations.user.name}</span>
							{!isPinned && (
								<span className="text-xs text-gray-500">
									{pageWithRelations.createdAt}
								</span>
							)}
						</div>
					</Link>
					{renderToc()}
				</div>
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
