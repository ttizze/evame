"use client";

import { ChevronDown, LanguagesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import Select, { type MultiValue } from "react-select";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { saveTargetLocalesAction } from "./action";

interface LocaleMultiSelectorProps {
	defaultValue?: string[];
	onChange?: (value: string[]) => void;
	className?: string;
}

export function LocaleMultiSelector({
	defaultValue = ["en"],
	onChange,
	className,
}: LocaleMultiSelectorProps) {
	const [selected, setSelected] = useState<string[]>(defaultValue);
	const [open, setOpen] = useState(false);
	const [_isSaving, startSaving] = useTransition();

	const options = supportedLocaleOptions.map((o) => ({
		value: o.code,
		label: o.name,
	}));
	const selectedOptions = options.filter((o) => selected.includes(o.value));

	const handleChange = (vals: MultiValue<{ value: string; label: string }>) => {
		const codes = vals.map((v) => v.value).slice(0, 2);
		setSelected(codes);
		onChange?.(codes);

		startSaving(() => {
			saveTargetLocalesAction(codes);
		});
	};

	const isOptionDisabled = (option?: { value: string }) =>
		selected.length >= 2 && !selected.includes(option?.value ?? "");
	const limitReached = selected.length >= 2;
	const count = selected.length;

	const selectClassNames = {
		control: () =>
			cn(
				"border border-border px-4 w-full rounded-lg bg-transparent cursor-pointer text-sm min-h-[72px]",
				limitReached && "ring-2 ring-accent-foreground",
			),
		valueContainer: () => "w-full flex flex-wrap gap-x-1 gap-y-1 py-2",
		placeholder: () => "text-center flex items-center",
		input: () => "m-0 p-0",
		multiValue: () =>
			"flex items-center gap-1 px-2 h-[24px] bg-primary rounded-full text-xs text-primary-foreground mr-1",
		multiValueLabel: () => "px-0.5",
		multiValueRemove: () => "hover:text-destructive cursor-pointer",
		menu: () => "bg-popover border border-border rounded-lg mt-2 min-w-48",
		option: ({
			isFocused,
			isDisabled,
		}: {
			isFocused: boolean;
			isDisabled: boolean;
		}) =>
			cn(
				"px-4 py-2 text-sm",
				isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
				isFocused && !isDisabled && "bg-accent",
			),
	} as const;

	const selectStyles = {
		menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
	};

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-label="Select translation languages"
					className={cn(
						"h-8 px-3 flex items-center gap-1 rounded-full hover:bg-secondary/80",
						className,
					)}
					size="sm"
					variant="ghost"
				>
					<LanguagesIcon className="w-4 h-4" />
					{count > 0 && (
						<span className="text-xs font-medium px-1 rounded-full min-w-[16px] text-center bg-primary text-primary-foreground">
							{count}
						</span>
					)}
					<ChevronDown className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="p-2 w-[300px] space-y-2">
				<Select
					classNamePrefix="rs"
					classNames={selectClassNames}
					isMulti
					isOptionDisabled={isOptionDisabled}
					menuPortalTarget={
						typeof window !== "undefined" ? document.body : undefined
					}
					onChange={handleChange}
					options={options}
					placeholder="Select locales"
					styles={selectStyles}
					unstyled
					value={selectedOptions}
				/>
				<Button className="w-full" onClick={() => setOpen(false)} size="sm">
					Done
				</Button>
			</PopoverContent>
		</Popover>
	);
}
