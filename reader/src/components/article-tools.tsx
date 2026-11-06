import { DownloadIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import { formatDate } from "@/app/[locale]/(common-layout)/_utils/format-date";
import { TocTrigger } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/sub-header/toc-trigger";
import type { TocItem } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/extract-toc-items";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { IslandProviders } from "./providers";

function ArticleTools({
	locale,
	handle,
	slug,
	name,
	image,
	createdAt,
	tocItems,
}: {
	locale: string;
	handle: string;
	slug: string;
	name: string;
	image: string | null;
	createdAt: Date;
	tocItems: TocItem[];
}) {
	const { data: session } = authClient.useSession();
	const hydrated = useHydrated();
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	const t = useTranslations("Reader");
	const downloadUrl = `/api/page-markdown?${new URLSearchParams({ locale, handle, slug })}`;
	return (
		<div data-article-header ref={headerRef}>
			<div
				className={`transition-all duration-300 z-999 ${!isVisible ? "-translate-y-full" : ""} ${isPinned ? "fixed top-0 left-0 right-0 shadow-md" : ""} bg-background py-4`}
			>
				<div
					className={`prose dark:prose-invert sm:prose lg:prose-lg mx-auto flex items-center not-prose justify-between relative ${isPinned ? "px-4" : ""}`}
				>
					<a
						className="flex items-center mr-2 no-underline! hover:text-gray-700"
						href={`/${locale}/${handle}`}
					>
						<Avatar className="w-10 h-10 shrink-0 mr-3">
							<AvatarImage
								alt={name}
								height={40}
								src={image ?? undefined}
								width={40}
							/>
							<AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm">{name}</span>
							{!isPinned && (
								<span className="text-xs text-gray-500">
									<time dateTime={new Date(createdAt).toISOString()}>
										{formatDate(createdAt, locale)}
									</time>
								</span>
							)}
						</div>
					</a>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label={t("downloadMarkdown")}
										asChild
										variant="ghost"
									>
										<a download href={downloadUrl}>
											<DownloadIcon className="h-4 w-4" />
										</a>
									</Button>
								</TooltipTrigger>
								<TooltipContent>{t("downloadMarkdown")}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						{hydrated && session?.user.handle === handle && (
							<Button asChild size="icon" variant="ghost">
								<a
									aria-label="Edit page"
									href={`/${locale}/${handle}/${slug}/edit`}
								>
									<PencilIcon className="h-5 w-5" />
								</a>
							</Button>
						)}
						<TocTrigger items={tocItems} />
					</div>
				</div>
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}

export function ArticleToolsIsland({
	search,
	...props
}: Parameters<typeof ArticleTools>[0] & { search: string }) {
	return (
		<IslandProviders locale={props.locale} search={search}>
			<ArticleTools {...props} />
		</IslandProviders>
	);
}
