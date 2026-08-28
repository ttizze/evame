"use client";
import { useLocale } from "next-intl";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import type { PageDetail } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TocItem } from "../../_domain/extract-toc-items";
import { ExportMarkdownButton } from "../export-markdown-button";
import { TocTrigger } from "./toc-trigger";

export function SubHeader({
	pageDetail,
	tocItems,
	markdown,
}: {
	pageDetail: PageDetail;
	tocItems: TocItem[];
	markdown: string;
}) {
	const locale = useLocale();

	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	return (
		<div ref={headerRef}>
			<div
				className={`transition-all duration-300 z-999 ${
					!isVisible ? "-translate-y-full" : ""
				}	${isPinned ? "fixed top-0 left-0 right-0  shadow-md" : ""} bg-background py-4`}
			>
				<div
					className={`prose dark:prose-invert sm:prose lg:prose-lg mx-auto 
					flex items-center not-prose justify-between relative ${isPinned ? "px-4" : ""}`}
				>
					<a
						className="flex items-center mr-2 no-underline! hover:text-gray-700"
						href={`/${locale}/${pageDetail.userHandle}`}
					>
						<Avatar className="w-10 h-10 shrink-0 mr-3 ">
							<AvatarImage
								alt={pageDetail.userName}
								height={40}
								src={pageDetail.userImage ?? undefined}
								width={40}
							/>
							<AvatarFallback>
								{pageDetail.userName.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm">{pageDetail.userName}</span>
							{!isPinned && (
								<span className="text-xs text-gray-500">
									<time>{pageDetail.createdAt.toLocaleDateString(locale)}</time>
								</span>
							)}
						</div>
					</a>
					<div className="flex items-center gap-2">
						<ExportMarkdownButton
							markdown={markdown}
							slug={pageDetail.slug}
							title={pageDetail.title}
						/>
						<TocTrigger items={tocItems} />
					</div>
				</div>
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
