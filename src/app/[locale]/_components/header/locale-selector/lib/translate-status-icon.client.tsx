import { FileText, FileX, Languages } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LocaleStatus } from "./build-locale-options";

interface Props {
	status: LocaleStatus;
}

export function TranslateStatusIcon({ status }: Props) {
	let IconComponent: typeof FileText;
	const colorClass = "text-muted-foreground";
	let label = "";

	switch (status) {
		case "source":
			IconComponent = FileText;
			label = "Source";
			break;

		case "untranslated":
			IconComponent = FileX;
			label = "Untranslated";
			break;

		default:
			IconComponent = Languages;
			label = "Translated";
			break;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<IconComponent
						className={cn("w-4 h-4 mr-2", colorClass)}
						data-testid={`${status}-icon`}
					/>
				</TooltipTrigger>
				{label && (
					<TooltipContent className="border bg-background text-foreground rounded-md px-2 py-1 shadow-md">
						{label}
					</TooltipContent>
				)}
			</Tooltip>
		</TooltipProvider>
	);
}
