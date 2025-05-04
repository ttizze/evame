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
import { useLocaleListAutoRefresh } from "./hooks/use-locale-list-auto-refresh.client";
import { buildLocaleOptions } from "./lib/build-locale-options";
import { TypeIcon } from "./lib/type-Icon.client";
const fetchJson = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		// ここで throw すれば SWR の error に入る
		throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
	}
	return res.json();
};

interface LocaleSelectorProps {
	pageId?: number;
	className?: string;

	/** Called if the user clicks the “Add New” button. */
	onAddNew: () => void;
	showIcons: boolean;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	pageId,
	className,
	onAddNew,
	showIcons = false,
}: LocaleSelectorProps) {
	const { data } = useSWR(
		pageId ? `/api/translation-jobs/by-page?pageId=${pageId}` : null,
		fetchJson,
		{ refreshInterval: 5000 },
	);
	const sourceLocale = data?.sourceLocale;
	const translationJobs = data?.translationJobs as TranslationJob[] | undefined;

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

	useLocaleListAutoRefresh(translationJobs);

	const localeOptions = buildLocaleOptions({
		sourceLocale: sourceLocale,
		existLocales: translationJobs?.map((job) => job.locale) ?? [],
		supported: supportedLocaleOptions,
	});

	const selectedOption = localeOptions.find(
		(item) => item.code === targetLocale,
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("justify-between rounded-xl", className)}
					data-testid="locale-selector-button"
				>
					<div className="flex items-center">
						{showIcons && sourceLocale && (
							<TypeIcon
								code={selectedOption?.code ?? ""}
								sourceLocale={sourceLocale}
							/>
						)}
						<span className="truncate">{selectedOption?.name ?? "Select"}</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0 truncate">
				<Command>
					<CommandInput placeholder="search..." />
					<CommandList>
						<CommandEmpty>No locales found.</CommandEmpty>
						<CommandGroup>
							{localeOptions.map((item) => (
								<CommandItem
									key={item.code}
									value={item.code}
									onSelect={handleLocaleChange}
								>
									{showIcons && sourceLocale && (
										<TypeIcon
											code={item.code}
											sourceLocale={sourceLocale}
											translationJobs={translationJobs}
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
				</Command>
			</PopoverContent>
		</Popover>
	);
}
