"use client";
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
import type { TranslationJob } from "@prisma/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { startTransition } from "react";
import useSWR from "swr";
import { useCombinedRouter } from "../hooks/use-combined-router";
import { buildLocaleOptions } from "./lib/build-locale-options";
import { TypeIcon } from "./lib/type-Icon.client";
type TranslationInfo = {
	sourceLocale: string;
	translationJobs: TranslationJob[];
};

const buildSlugKey = ({
	pageSlug,
}: {
	pageSlug?: string;
}) => (pageSlug ? `pageSlug=${pageSlug}` : null);

const fetchTranslation: (url: string) => Promise<TranslationInfo> = async (
	url,
) => {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
};

interface LocaleSelectorProps {
	localeSelectorClassName?: string;
	pageSlug?: string;
	/** Called if the user clicks the “Add New” button. */
	onAddNew: () => void;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	localeSelectorClassName,
	onAddNew,
	pageSlug,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const router = useCombinedRouter();
	const params = useParams();
	const pathname = usePathname();
	const targetLocale = useLocale();
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
	let showIcons = false;
	if (pageSlug) {
		showIcons = true;
	}
	const showAddNewButton = pageSlug;
	const slugKey = buildSlugKey({ pageSlug });
	const apiUrl = slugKey ? `/api/locale-info?${slugKey}` : null;

	const { data, error } = useSWR(apiUrl, fetchTranslation);

	const { sourceLocale, translationJobs } = data ?? {};
	const localeOptionWithStatus = buildLocaleOptions({
		sourceLocale,
		existLocales: translationJobs?.map((job) => job.locale) ?? [],
		supported: supportedLocaleOptions,
	});

	const selectedOption = localeOptionWithStatus.find(
		(item) => item.code === targetLocale,
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					className={cn("justify-between ", localeSelectorClassName)}
					data-testid="locale-selector-button"
				>
					<div className="flex items-center">
						{showIcons && sourceLocale && (
							<TypeIcon status={selectedOption?.status ?? "untranslated"} />
						)}
						<span className="truncate">{selectedOption?.name ?? "Select"}</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				sideOffset={-4} // -4px で “ピタッ” と密着
				avoidCollisions={false}
				className="w-full p-0  truncate"
			>
				<Command>
					<CommandInput placeholder="search..." />
					<CommandList>
						<CommandEmpty>No locales found.</CommandEmpty>
						<CommandGroup>
							{localeOptionWithStatus.map((item) => (
								<CommandItem
									key={item.code}
									value={item.code}
									onSelect={handleLocaleChange}
								>
									{showIcons && sourceLocale && (
										<TypeIcon status={item.status} />
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
									variant="default"
									className="rounded-full"
									onClick={onAddNew}
								>
									+ Add New
								</Button>
							</div>
						</>
					)}
				</Command>
			</PopoverContent>
		</Popover>
	);
}
