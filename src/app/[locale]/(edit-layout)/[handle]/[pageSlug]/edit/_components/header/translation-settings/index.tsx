"use client";

import { LanguagesIcon, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ContextList } from "./components/context-list";
import { MultiLocaleSelect } from "./components/multi-locale-select";
import type { TranslationContext } from "./types";

interface TranslationSettingsProps {
	initialContexts: TranslationContext[];
	selectedContextId: number | null;
	onContextChange: (contextId: number | null) => void;
	locales: string[];
	onLocalesChange: (locales: string[]) => void;
	maxSelectableLocales: number;
}

export function TranslationSettings({
	initialContexts,
	selectedContextId,
	onContextChange,
	locales,
	onLocalesChange,
	maxSelectableLocales,
}: TranslationSettingsProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					aria-label="Translation settings"
					className="h-8 px-3 flex items-center gap-1 rounded-full hover:bg-secondary/80"
					size="sm"
					variant="outline"
				>
					<LanguagesIcon className="size-4" />
					<Settings2 className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="p-3 w-[320px] space-y-4">
				<MultiLocaleSelect
					maxSelectable={maxSelectableLocales}
					onChange={onLocalesChange}
					value={locales}
				/>

				<Separator />

				<ContextList
					initialContexts={initialContexts}
					onContextChange={onContextChange}
					selectedContextId={selectedContextId}
				/>
			</PopoverContent>
		</Popover>
	);
}
