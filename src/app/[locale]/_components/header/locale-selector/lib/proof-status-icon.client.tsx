import type { TranslationProofStatus } from "@prisma/client";
import { Circle } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { proofColorMap, proofLabelMap } from "./translation-proof-status";

export function ProofStatusIcon({
	translationProofStatus,
}: {
	translationProofStatus: TranslationProofStatus;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Circle
						className={cn(
							"w-3 h-3 mr-1",
							proofColorMap[translationProofStatus],
						)}
						data-testid={`proof-${translationProofStatus}-icon`}
						fill="currentColor"
					/>
				</TooltipTrigger>
				<TooltipContent className="border bg-background text-foreground rounded-md px-2 py-1 shadow-md">
					{proofLabelMap[translationProofStatus]}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
