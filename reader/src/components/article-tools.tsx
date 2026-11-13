import { DownloadIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
import { formatDate } from "@/app/[locale]/(common-layout)/_utils/format-date";
import { TocTrigger } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/sub-header/toc-trigger";
import type { TocItem } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/extract-toc-items";
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
	createdAt,
	tocItems,
}: {
	locale: string;
	handle: string;
	slug: string;
	createdAt: Date;
	tocItems: TocItem[];
}) {
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	const t = useTranslations("Reader");
	const downloadUrl = `/api/page-markdown?${new URLSearchParams({ locale, handle, slug })}`;
	return (
		<div data-article-header ref={headerRef}>
			<div
				className={`transition-all duration-300 z-999 ${!isVisible ? "-translate-y-full" : ""} ${isPinned ? "fixed top-0 left-0 right-0 shadow-md" : ""} bg-background py-4`}
			>
				<div
					className={`prose dark:prose-invert sm:prose lg:prose-lg mx-auto flex items-center not-prose justify-between gap-4 relative ${isPinned ? "px-4" : ""}`}
				>
					<time
						className="whitespace-nowrap text-base font-medium tabular-nums text-muted-foreground md:text-lg"
						dateTime={new Date(createdAt).toISOString()}
					>
						{formatDate(createdAt, locale)}
					</time>
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
