"use client";
import { Check, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { startTransition, useState } from "react";
import useSWR from "swr";
import { supportedLocaleOptions } from "@/app/_constants/locale";
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
import type { TranslationJobs, Translationproofstatus } from "@/db/types";
import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { TranslationProofStatusIcon } from "./component/translation-proof-status-icon.client";
import { TextStatusGuide } from "./component/translation-status-guide.client";
import { buildLocaleOptions } from "./domain/build-locale-options";
import { useCombinedRouter } from "./hooks/use-combined-router";

// Local types
interface TranslationInfo {
	sourceLocale: string;
	translationJobs: TranslationJobs[];
	translationProofs: {
		locale: string;
		translationProofStatus: Translationproofstatus;
	}[];
}

// Helpers
const buildSlugKey = ({ pageSlug }: { pageSlug?: string }) =>
	pageSlug ? `pageSlug=${pageSlug}` : null;

const fetchTranslation: (url: string) => Promise<TranslationInfo> = async (
	url,
) => {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
};

// Props
interface LocaleSelectorProps {
	localeSelectorClassName?: string;
	currentHandle?: string;
	hasGeminiApiKey: boolean;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	localeSelectorClassName,
	currentHandle,
	hasGeminiApiKey,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const router = useCombinedRouter();
	const pathname = usePathname();
	const targetLocale = useLocale();
	const { pageSlug } = useParams<{
		pageSlug?: string;
	}>();
	const handleLocaleChange = (value: string) => {
		setOpen(false);
		startTransition(() => {
			router.push(pathname, { locale: value });
		});
	};

	const showIcons = Boolean(pageSlug);
	const showAddNewButton = Boolean(pageSlug);

	const slugKey = buildSlugKey({ pageSlug });
	const apiUrl = slugKey ? `/api/locale-info?${slugKey}` : null;

	const { data } = useSWR(apiUrl, fetchTranslation);

	const { sourceLocale, translationJobs, translationProofs } = data ?? {};

	// Build a map of locale => proof status using Kysely enum values directly
	const proofStatusMap = Object.fromEntries(
		(translationProofs ?? []).map<[string, Translationproofstatus]>((p) => [
			p.locale,
			p.translationProofStatus,
		]),
	) as Record<string, Translationproofstatus>;

	const localeOptionWithStatus = buildLocaleOptions({
		sourceLocale,
		existLocales: translationJobs?.map((job) => job.locale) ?? [],
		supported: supportedLocaleOptions,
		proofStatusMap,
	});

	const selectedOption = localeOptionWithStatus.find(
		(item) => item.code === targetLocale,
	);

	return (
		<div>
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<button
						className={cn(
							"flex justify-between items-center opacity-100 w-full rounded-none px-4 py-2  cursor-pointer hover:bg-accent hover:text-accent-foreground",
							localeSelectorClassName,
						)}
						data-testid="locale-selector-button"
						type="button"
					>
						<div className="flex items-center">
							{showIcons && sourceLocale && (
								<TranslationProofStatusIcon
									localeStatus={selectedOption?.status ?? "untranslated"}
									proofStatus={selectedOption?.proofStatus}
								/>
							)}
							<span className="truncate">
								{selectedOption?.name ?? "Select"}
							</span>
						</div>
						<ChevronDown
							className={cn(
								"ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
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
								{localeOptionWithStatus.map((item) => (
									<CommandItem
										key={item.code}
										onSelect={handleLocaleChange}
										value={item.code}
									>
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
									</CommandItem>
								))}
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
				/>
			)}
		</div>
	);
}
