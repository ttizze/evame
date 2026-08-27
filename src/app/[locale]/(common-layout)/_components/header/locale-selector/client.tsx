"use client";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
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
import { isSupportedLocale, supportedLocales } from "@/domain/locales";
import { cn } from "@/lib/utils";

export function replacePathLocale(
	pathname: string,
	nextLocale: string,
): string {
	if (!isSupportedLocale(nextLocale)) return pathname;
	const segments = pathname.split("/");
	if (!isSupportedLocale(segments[1])) return `/${nextLocale}`;
	segments[1] = nextLocale;
	return segments.join("/") || `/${nextLocale}`;
}

export function LocaleSelector({ locale }: { locale: string }) {
	const [open, setOpen] = useState(false);
	const selectedOption = supportedLocales.find((item) => item.code === locale);

	const handleLocaleChange = (value: string) => {
		setOpen(false);
		const pathname = replacePathLocale(window.location.pathname, value);
		window.location.assign(
			`${pathname}${window.location.search}${window.location.hash}`,
		);
	};

	return (
		<div>
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<button
						className={cn(
							"flex justify-between items-center opacity-100 w-full rounded-none px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
						)}
						data-testid="locale-selector-button"
						type="button"
					>
						<div className="flex items-center">
							<span className="truncate">
								{selectedOption?.label ?? "Select"}
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
				<PopoverContent className="w-60 p-0 truncate" sideOffset={-4}>
					<Command>
						<CommandInput placeholder="search..." />
						<CommandList>
							<CommandEmpty>No locales found.</CommandEmpty>
							<CommandGroup>
								{supportedLocales.map((item) => (
									<CommandItem
										key={item.code}
										onSelect={handleLocaleChange}
										value={item.code}
									>
										<span className="truncate grow">{item.label}</span>
										{locale === item.code && <Check className="ml-2 h-4 w-4" />}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
