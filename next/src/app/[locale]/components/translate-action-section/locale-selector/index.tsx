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
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { startTransition } from "react";
interface LocaleOption {
	code: string;
	name: string;
}

interface LocaleSelectorProps {
	locale: string;
	className?: string;
	localeOptions: LocaleOption[];
	showAddNew?: boolean;
	onAddNew?: () => void;
	onChange?: (value: string) => void;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	locale,
	className,
	localeOptions,
	showAddNew,
	onAddNew,
	onChange,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const router = useRouter();
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

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("justify-between rounded-xl", className)}
				>
					<span className="truncate">
						{localeOptions.find((item) => item.code === locale)?.name ??
							"Select"}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0 truncate">
				<Command>
					<CommandInput placeholder="search..." />
					<CommandList>
						<CommandEmpty>No locales found.</CommandEmpty>
						<CommandGroup>
							{localeOptions.map((item) => {
								return (
									<CommandItem
										key={item.code}
										value={item.code}
										onSelect={handleLocaleChange}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												locale === item.code ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="truncate">{item.name}</span>
									</CommandItem>
								);
							})}
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
