import { FileText, FileX, Languages } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LocaleStatus } from "./build-locale-options";
import type { TranslationProofStatus } from "@prisma/client";

/* -------------------------------------------------------------------------
 * マッピング
 * -------------------------------------------------------------------------*/

const proofColorMap: Record<TranslationProofStatus, string> = {
	MACHINE_DRAFT: "text-rose-500",
	HUMAN_TOUCHED: "text-orange-400",
	PROOFREAD: "text-amber-400",
	VALIDATED: "text-emerald-500",
};

const proofLabelMap: Record<TranslationProofStatus, string> = {
	MACHINE_DRAFT: "Machine draft",
	HUMAN_TOUCHED: "Human touched",
	PROOFREAD: "Proofread",
	VALIDATED: "Validated",
};

interface Props {
	status: LocaleStatus;
	translationProofStatus?: TranslationProofStatus;
}

/**
 * かたち（status） × いろ（proofStatus）を 1 つのアイコンに閉じ込める
 */
export function TypeIcon({ status, translationProofStatus }: Props) {
	let IconComponent: typeof FileText;
	let colorClass = "text-muted-foreground";
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

		case "translated":
		default:
			IconComponent = Languages;
			if (translationProofStatus) {
				colorClass = proofColorMap[translationProofStatus];
				label = proofLabelMap[translationProofStatus];
			} else {
				label = "Translated";
			}
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
