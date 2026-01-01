"use client";
import { ChevronDown, List, PencilIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { useLocale } from "next-intl";
import { useState } from "react";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import type { PageDetail } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import type { TocItem } from "../_domain/extract-toc-items";
import Toc from "./toc";

export function SubHeader({
	pageDetail,
	tocItems,
}: {
	pageDetail: PageDetail;
	tocItems: TocItem[];
}) {
	const hydrated = useHydrated();
	const locale = useLocale();
	const [isTocOpen, setIsTocOpen] = useState(false);
	const hasTocContent = tocItems.length > 0;
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const isEditable = currentUser?.handle === pageDetail.user.handle;

	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

	const renderToc = () => {
		if (!hasTocContent) return null;

		return (
			<>
				<Button
					className={
						"relative bg-background self-end flex items-center gap-1 rounded-full"
					}
					onClick={() => setIsTocOpen(!isTocOpen)}
					title="Table of Contents"
					variant="ghost"
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
						<Toc items={tocItems} onItemClick={() => setIsTocOpen(false)} />
					</div>
				)}
			</>
		);
	};
	const { props } = getImageProps({
		src: pageDetail.user.image,
		alt: pageDetail.user.name,
		width: 40,
		height: 40,
	});
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
					<Link
						className="flex items-center mr-2 no-underline! hover:text-gray-700"
						href={`/user/${pageDetail.user.handle}`}
					>
						<Avatar className="w-10 h-10 shrink-0 mr-3 ">
							<AvatarImage {...props} />
							<AvatarFallback>
								{pageDetail.user.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm">{pageDetail.user.name}</span>
							{!isPinned && (
								<span className="text-xs text-gray-500">
									<time>{pageDetail.createdAt.toLocaleDateString(locale)}</time>
								</span>
							)}
						</div>
					</Link>
					<div className="flex items-center gap-2">
						{isEditable && (
							<Link
								href={`/user/${currentUser?.handle}/page/${pageDetail.slug}/edit`}
								prefetch={false}
							>
								<Button variant="ghost">
									<PencilIcon className="h-4 w-4" />
								</Button>
							</Link>
						)}
						{renderToc()}
					</div>
				</div>
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
