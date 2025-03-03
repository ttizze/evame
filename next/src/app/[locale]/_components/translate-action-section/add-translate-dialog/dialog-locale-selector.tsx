"use client";
import { supportedLocaleOptions } from "@/app/constants/locale";
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

interface DialogLocaleSelectorProps {
	targetLocale: string;
	onChange: (value: string) => void;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function DialogLocaleSelector({
	targetLocale,
	onChange,
}: DialogLocaleSelectorProps) {
	const [open, setOpen] = useState(false);

	const selectedOption = supportedLocaleOptions.find(
		(item) => item.code === targetLocale,
	);

	const handleLocaleChange = (value: string) => {
		setOpen(false);
		onChange(value);
	};
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("justify-between rounded-xl w-full")}
				>
					<div className="flex items-center">
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
							{supportedLocaleOptions.map((item) => (
								<CommandItem
									key={item.code}
									value={item.code}
									onSelect={handleLocaleChange}
								>
									<span className="truncate flex-grow">{item.name}</span>
									{targetLocale === item.code && (
										<Check className="ml-2 h-4 w-4" />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
