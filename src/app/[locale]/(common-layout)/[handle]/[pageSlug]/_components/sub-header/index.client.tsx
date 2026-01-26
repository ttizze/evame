"use client";
import { PencilIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { useLocale } from "next-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import type { PageDetail } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { TocItem } from "../../_domain/extract-toc-items";
import { TocTrigger } from "./toc-trigger";

export function SubHeader({
	pageDetail,
	tocItems,
}: {
	pageDetail: PageDetail;
	tocItems: TocItem[];
}) {
	const hydrated = useHydrated();
	const locale = useLocale();
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const isEditable = currentUser?.handle === pageDetail.userHandle;

	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	const { props } = getImageProps({
		src: pageDetail.userImage,
		alt: pageDetail.userName,
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
						href={`/${pageDetail.userHandle}`}
					>
						<Avatar className="w-10 h-10 shrink-0 mr-3 ">
							<AvatarImage {...props} />
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
					</Link>
					<div className="flex items-center gap-2">
						{isEditable && (
							<Link
								href={`/${pageDetail.userHandle}/${pageDetail.slug}/edit`}
								prefetch={false}
							>
								<Button variant="ghost">
									<PencilIcon className="h-4 w-4" />
								</Button>
							</Link>
						)}
						<TocTrigger items={tocItems} />
					</div>
				</div>
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
