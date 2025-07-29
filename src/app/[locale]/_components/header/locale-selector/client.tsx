"use client";
import type { TranslationJob, TranslationProofStatus } from "@prisma/client";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { useCombinedRouter } from "./hooks/use-combined-router";
import { buildLocaleOptions } from "./lib/build-locale-options";
import { ProofStatusIcon } from "./lib/proof-status-icon.client";
import { TranslateStatusIcon } from "./lib/translate-status-icon.client";

// Local types
interface TranslationInfo {
	sourceLocale: string;
	translationJobs: TranslationJob[];
	translationProofs: {
		locale: string;
		translationProofStatus: TranslationProofStatus;
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
	const params = useParams();
	const pathname = usePathname();
	const targetLocale = useLocale();
	const { pageSlug } = useParams<{
		pageSlug?: string;
	}>();
	const handleLocaleChange = (value: string) => {
		setOpen(false);
		startTransition(() => {
			router.push(
				// @ts-expect-error next-intlの型がおかしい
				{ pathname, params },
				{ locale: value },
			);
		});
	};

	const showIcons = Boolean(pageSlug);
	const showAddNewButton = Boolean(pageSlug);

	const slugKey = buildSlugKey({ pageSlug });
	const apiUrl = slugKey ? `/api/locale-info?${slugKey}` : null;

	const { data } = useSWR(apiUrl, fetchTranslation);

	const { sourceLocale, translationJobs, translationProofs } = data ?? {};

	// Build a map of locale => proof status using Prisma enum values directly
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

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					className={cn("justify-between ", localeSelectorClassName)}
					data-testid="locale-selector-button"
					variant="ghost"
				>
					<div className="flex items-center">
						{showIcons && sourceLocale && (
							<>
								<TranslateStatusIcon
									status={selectedOption?.status ?? "untranslated"}
								/>
								{selectedOption?.proofStatus && (
									<ProofStatusIcon
										translationProofStatus={selectedOption.proofStatus}
									/>
								)}
							</>
						)}
						<span className="truncate">{selectedOption?.name ?? "Select"}</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				avoidCollisions={false} // -4px で "ピタッ" と密着
				className="w-full p-0  truncate"
				sideOffset={-4}
			>
				<Command>
					<CommandInput placeholder="search..." />
					<CommandList>
						<CommandEmpty>No locales found.</CommandEmpty>
						<CommandGroup>
							{localeOptionWithStatus.map((item) => (
								<CommandItem
									key={item.code}
									onSelect={handleLocaleChange}
									value={item.code}
								>
									{showIcons && sourceLocale && (
										<>
											<TranslateStatusIcon status={item.status} />
											{item.proofStatus && (
												<ProofStatusIcon
													translationProofStatus={item.proofStatus}
												/>
											)}
										</>
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
			{pageSlug && (
				<AddTranslateDialog
					currentHandle={currentHandle}
					hasGeminiApiKey={hasGeminiApiKey}
					onOpenChange={setDialogOpen}
					open={dialogOpen}
					pageSlug={pageSlug}
				/>
			)}
		</Popover>
	);
}
