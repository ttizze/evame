"use client";
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
import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Languages, Text } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { startTransition } from "react";
import { useCombinedRouter } from "../hooks/use-combined-router";
interface LocaleOption {
	code: string;
	name: string;
}

interface LocaleSelectorProps {
	locale: string;
	sourceLocale: string;
	className?: string;
	localeOptions: LocaleOption[];
	showAddNew?: boolean;
	onAddNew?: () => void;
	onChange?: (value: string) => void;
}
function TypeIcon({
	code,
	sourceLocale,
}: {
	code: string;
	sourceLocale: string;
}) {
	return code === sourceLocale ? (
		<Text className="w-4 h-4 mr-2" />
	) : (
		<Languages className="w-4 h-4 mr-2" />
	);
}
//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	locale,
	sourceLocale,
	className,
	localeOptions,
	showAddNew,
	onAddNew,
	onChange,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const router = useCombinedRouter();
	const params = useParams();
	const pathname = usePathname();
	const handleLocaleChange = (value: string) => {
		setOpen(false);
		if (onChange) {
			onChange(value);
		} else {
			// デフォルトはルーティングを実行
			startTransition(() => {
				router.push(
					// @ts-expect-error
					{ pathname, params },
					{ locale: value },
				);
			});
		}
	};

	const selectedOption = localeOptions.find((item) => item.code === locale);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("justify-between rounded-xl", className)}
				>
					<div className="flex items-center">
						<TypeIcon
							code={selectedOption?.code || ""}
							sourceLocale={sourceLocale}
						/>
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
									<TypeIcon code={item.code} sourceLocale={sourceLocale} />
									<span className="truncate flex-grow">{item.name}</span>
									{locale === item.code && <Check className="ml-2 h-4 w-4" />}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
					{showAddNew && (
						<div className="flex justify-center m-2">
							<Button
								variant="default"
								className="rounded-full"
								onClick={onAddNew}
							>
								+ Add New
							</Button>
						</div>
					)}
				</Command>
			</PopoverContent>
		</Popover>
	);
}
