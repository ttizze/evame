"use client";
import { ChevronDown, List, PencilIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { useLocale } from "next-intl";
import { useState } from "react";
import { useDisplay } from "@/app/_context/display-provider";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import type { PageDetail } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
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
	const { mode } = useDisplay();
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const isEditable = currentUser?.handle === pageDetail.user.handle;

	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

	const renderToc = () => {
		if (!hasTocContent) return null;

		return (
			<Popover onOpenChange={setIsTocOpen} open={isTocOpen}>
				<PopoverAnchor asChild>
					<span className="inline-flex">
						<PopoverTrigger asChild>
							<Button
								aria-label="Table of Contents"
								className="flex items-center gap-2 rounded-full text-sm"
								title="Table of Contents"
								variant="ghost"
							>
								<List className="size-5" />
								<ChevronDown
									className={cn(
										"size-4 transition-transform duration-200",
										isTocOpen && "rotate-180",
									)}
								/>
							</Button>
						</PopoverTrigger>
					</span>
				</PopoverAnchor>
				<PopoverContent
					align="end"
					className="w-80 rounded-xl border border-border/70 bg-background p-4 shadow-lg dark:shadow-[0_9px_7px_rgba(255,255,255,0.1)] 
					"
					data-display-mode={mode}
					onFocusOutside={(event) => event.preventDefault()}
				>
					<Toc items={tocItems} />
				</PopoverContent>
			</Popover>
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
