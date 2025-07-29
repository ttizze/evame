"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";
import { TranslationProofStatusIcon } from "./translation-proof-status-icon.client";

export function TextStatusGuide() {
	const [showHelpSection, setShowHelpSection] = useState(false);

	return (
		<div className="px-3 py-2">
			<button
				className="flex w-full justify-between text-sm cursor-pointer text-muted-foreground items-center"
				onClick={() => setShowHelpSection(!showHelpSection)}
				type="button"
			>
				<div className="flex items-center ">
					<Info className="mr-2 h-3 w-3 shrink-0 opacity-50" />
					<span>Text Status Guide</span>
				</div>
				<ChevronDown
					className={cn(
						"h-4 w-4 transition-transform",
						showHelpSection && "rotate-180",
					)}
				/>
			</button>
			{showHelpSection && (
				<div className="mt-2 space-y-3 p-2 bg-muted/50 rounded-md">
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus={undefined}
							status="source"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Source</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								Original content in the source language.
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus="MACHINE_DRAFT"
							status="translated"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Machine Draft</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								AI-generated translation without human review.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus="HUMAN_TOUCHED"
							status="translated"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Human Touched</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								Manually edited by a human translator.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus="PROOFREAD"
							status="translated"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Proofread</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								Reviewed for accuracy and cultural appropriateness.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus="VALIDATED"
							status="translated"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Validated</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								Approved by a qualified reviewer. Ready for publication.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							proofStatus={undefined}
							status="untranslated"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">Untranslated</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								Content that has not been translated yet.
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
