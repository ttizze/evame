import { Check, ChevronDown, Languages } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "use-intl";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { parseReaderRoute } from "@/app/_domain/reader-route";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { TranslationProofStatus } from "@/db/types";
import type { TranslationJob } from "@/db/types.helpers";
import { cn } from "@/lib/utils";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { TranslationProofStatusIcon } from "./component/translation-proof-status-icon";
import { TextStatusGuide } from "./component/translation-status-guide.client";
import { buildLocaleOptions } from "./domain/build-locale-options";

// Local types
interface TranslationInfo {
	sourceLocale: string;
	translationJobs: TranslationJob[];
	translationProofs: {
		locale: string;
		translationProofStatus: TranslationProofStatus;
	}[];
}

const fetchTranslation: (url: string) => Promise<TranslationInfo> = async (
	url,
) => {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
};

// Props
interface LocaleSelectorProps {
	inMenu: boolean;
	currentHandle?: string;
	hasGeminiApiKey: boolean;
	userPlan: string;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	inMenu,
	currentHandle,
	hasGeminiApiKey,
	userPlan,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const targetLocale = useLocale();
	const t = useTranslations("Header");
	const location = new URL(
		typeof window === "undefined"
			? `https://evame.tech/${targetLocale}`
			: window.location.href,
	);
	const route = parseReaderRoute(location.pathname, location.search);
	const pageSlug = route?.kind === "article" ? route.pageSlug : undefined;
	const pathWithoutLocale = location.pathname
		.replace(new RegExp(`^/${targetLocale}(?=/|$)`), "")
		.replace(/\/$/, "");

	const showIcons = Boolean(pageSlug);
	const showAddNewButton = Boolean(pageSlug);

	const apiUrl = pageSlug
		? `/api/locale-info?${new URLSearchParams({ pageSlug })}`
		: null;

	const { data } = useSWR(apiUrl, fetchTranslation);

	const { sourceLocale, translationJobs, translationProofs } = data ?? {};

	// Build a map of locale => proof status using Kysely enum values directly
	const proofStatusMap = Object.fromEntries(
		(translationProofs ?? []).map<[string, TranslationProofStatus]>((p) => [
			p.locale,
			p.translationProofStatus,
		]),
	) as Record<string, TranslationProofStatus>;

	const localeOptionWithStatus = buildLocaleOptions({
		sourceLocale,
		existLocales: translationJobs?.map((job) => job.locale) ?? [],
		supported: supportedLocaleOptions,
		proofStatusMap,
	});

	const selectedOption = localeOptionWithStatus.find(
		(item) => item.code === targetLocale,
	);
	const languageLabel = t("languageChange", {
		language: selectedOption?.name ?? targetLocale,
	});

	return (
		<div>
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<button
						aria-label={inMenu ? undefined : languageLabel}
						className={cn(
							"flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
							inMenu
								? "w-[200px] rounded-none py-3 text-sm"
								: "border rounded-full w-[150px] max-md:size-6 max-md:p-0 max-md:border-0",
						)}
						data-testid="locale-selector-button"
						title={inMenu ? undefined : languageLabel}
						type="button"
					>
						<div className="flex min-w-0 items-center [&_svg]:shrink-0">
							{!inMenu && <Languages className="h-6 w-6 md:hidden" />}
							{showIcons && sourceLocale ? (
								<span className={inMenu ? "contents" : "hidden md:contents"}>
									<TranslationProofStatusIcon
										localeStatus={selectedOption?.status ?? "untranslated"}
										proofStatus={selectedOption?.proofStatus}
									/>
								</span>
							) : inMenu ? (
								<Languages className="h-4 w-4 mr-2" />
							) : null}
							<span className={cn("truncate", !inMenu && "hidden md:inline")}>
								{selectedOption?.name ?? "Select"}
							</span>
						</div>
						<ChevronDown
							className={cn(
								"ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
								!inMenu && "hidden md:block",
								open && "rotate-180",
							)}
						/>
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-60 p-0  truncate" sideOffset={-4}>
					<Command>
						<CommandInput placeholder="search..." />
						<CommandList>
							{pageSlug && (
								<>
									<TextStatusGuide />
									<Separator />
								</>
							)}
							<CommandEmpty>No locales found.</CommandEmpty>
							<CommandGroup>
								{localeOptionWithStatus.map((item) => {
									const href = `/${item.code}${pathWithoutLocale}${location.search}${location.hash}`;
									return (
										<CommandItem
											asChild
											key={item.code}
											onSelect={() => {
												setOpen(false);
												window.location.assign(href);
											}}
											value={item.code}
										>
											<a href={href}>
												{showIcons && sourceLocale && (
													<TranslationProofStatusIcon
														localeStatus={item.status}
														proofStatus={item.proofStatus}
													/>
												)}
												<span className="truncate grow">{item.name}</span>
												{targetLocale === item.code && (
													<Check className="ml-2 h-4 w-4" />
												)}
											</a>
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
						{showAddNewButton && (
							<>
								<Separator />
								<div className="flex justify-center m-2">
									<Button
										className="rounded-full"
										onClick={() => setDialogOpen(true)}
										variant="default"
									>
										+ Add New
									</Button>
								</div>
							</>
						)}
					</Command>
				</PopoverContent>
			</Popover>
			{pageSlug && (
				<AddTranslateDialog
					currentHandle={currentHandle}
					hasGeminiApiKey={hasGeminiApiKey}
					onOpenChange={setDialogOpen}
					open={dialogOpen}
					pageSlug={pageSlug}
					userPlan={userPlan}
				/>
			)}
		</div>
	);
}
