"use client";

import { LanguagesIcon } from "lucide-react";
import Select, { type MultiValue } from "react-select";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { cn } from "@/lib/utils";
import { saveTargetLocalesAction } from "./action";

interface MultiLocaleSelectProps {
	value: string[];
	onChange: (value: string[]) => void;
	maxSelectable: number;
}

const selectClassNames = {
	control: () =>
		cn(
			"border border-border px-3 w-full rounded-lg bg-transparent cursor-pointer text-sm min-h-[60px]",
		),
	valueContainer: () => "w-full flex flex-wrap gap-x-1 gap-y-1 py-2",
	placeholder: () => "text-center flex items-center text-muted-foreground",
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

export function MultiLocaleSelect({
	value,
	onChange,
	maxSelectable,
}: MultiLocaleSelectProps) {
	const options = supportedLocaleOptions.map((o) => ({
		value: o.code,
		label: o.name,
	}));
	const selectedOptions = options.filter((o) => value.includes(o.value));

	const handleChange = (vals: MultiValue<{ value: string; label: string }>) => {
		const codes = vals.map((v) => v.value).slice(0, maxSelectable);
		onChange(codes);
		const formData = new FormData();
		for (const code of codes) {
			formData.append("locales", code);
		}
		saveTargetLocalesAction({ success: false }, formData);
	};

	const isOptionDisabled = (option?: { value: string }) =>
		value.length >= maxSelectable && !value.includes(option?.value ?? "");

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-sm font-medium">
				<LanguagesIcon className="size-4" />
				<span>Target Languages</span>
				<span className="text-xs text-muted-foreground ml-auto">
					max {maxSelectable}
				</span>
			</div>
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
				placeholder="Select languages..."
				styles={{
					menuPortal: (base) => ({ ...base, zIndex: 9999 }),
				}}
				unstyled
				value={selectedOptions}
			/>
		</div>
	);
}
