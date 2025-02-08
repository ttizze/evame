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
import { useState, useTransition } from "react";

interface LocaleOption {
	code: string;
	name: string;
}

interface LocaleSelectorProps {
	className?: string;
	localeOptions: LocaleOption[];
	defaultLocaleCode: string;
	setIsSettingsOpen?: (value: boolean) => void;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export default function LocaleSelector({
	className,
	localeOptions,
	defaultLocaleCode,
	setIsSettingsOpen,
}: LocaleSelectorProps) {
	const [open, setOpen] = useState(false);
	const [currentLocaleCode, setCurrentLocaleCode] = useState(defaultLocaleCode);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const pathname = usePathname();
	const params = useParams();
	const handleLocaleChange = (value: string) => {
		setCurrentLocaleCode(value);
		setOpen(false);
		startTransition(() => {
			router.replace(
				// @ts-expect-error -- TypeScript will validate that only known `params`
				// are used in combination with a given `pathname`. Since the two will
				// always match for the current route, we can skip runtime checks.
				{ pathname, params },
				{ locale: value },
			);
		});
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("justify-between rounded-xl", className)}
				>
					<span className="truncate">
						{localeOptions.find((item) => item.code === currentLocaleCode)
							?.name ?? "Select"}
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
							{localeOptions.map((item, index) => {
								return (
									<CommandItem
										key={item.code}
										value={item.code}
										onSelect={handleLocaleChange}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												currentLocaleCode === item.code
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										<span className="truncate">{item.name}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
					{setIsSettingsOpen && (
						<div className="flex justify-center m-2">
							<Button
								variant="default"
								className="rounded-full"
								onClick={() => {
									setIsSettingsOpen(true);
								}}
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
