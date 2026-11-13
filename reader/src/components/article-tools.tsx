import { DownloadIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { formatDate } from "@/app/[locale]/(common-layout)/_utils/format-date";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { IslandProviders } from "./providers";

export function ArticleToolsFrame({
	locale,
	createdAt,
	actions,
}: {
	locale: string;
	createdAt: Date;
	actions: ReactNode;
}) {
	return (
		<div
			className="transition-all duration-300 z-999 bg-background py-4"
			data-scroll-header
		>
			<div
				className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto flex items-center not-prose justify-between gap-4 relative"
				data-scroll-padding
			>
				<time
					className="whitespace-nowrap text-base font-medium tabular-nums text-muted-foreground md:text-lg"
					dateTime={new Date(createdAt).toISOString()}
				>
					{formatDate(createdAt, locale)}
				</time>
				{actions}
			</div>
		</div>
	);
}

function ArticleActions({
	locale,
	handle,
	slug,
}: {
	locale: string;
	handle: string;
	slug: string;
}) {
	const t = useTranslations("Reader");
	const downloadUrl = `/api/page-markdown?${new URLSearchParams({ locale, handle, slug })}`;
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button aria-label={t("downloadMarkdown")} asChild variant="ghost">
						<a data-reader-tooltip download href={downloadUrl}>
							<DownloadIcon className="h-4 w-4" />
						</a>
					</Button>
				</TooltipTrigger>
				<TooltipContent>{t("downloadMarkdown")}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function ArticleActionsIsland({
	search,
	...props
}: Parameters<typeof ArticleActions>[0] & { search: string }) {
	return (
		<IslandProviders locale={props.locale} search={search}>
			<ArticleActions {...props} />
		</IslandProviders>
	);
}
