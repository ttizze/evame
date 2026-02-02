"use client";

import { ChevronDown, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TranslationProofStatusIcon } from "./translation-proof-status-icon.client";

export function TextStatusGuide() {
	const [showHelpSection, setShowHelpSection] = useState(false);
	const t = useTranslations("Header.TextStatusGuide");

	return (
		<div className="px-3 py-2">
			<button
				className="flex w-full justify-between text-sm cursor-pointer text-muted-foreground items-center"
				onClick={() => setShowHelpSection(!showHelpSection)}
				type="button"
			>
				<div className="flex items-center ">
					<Info className="mr-2 h-3 w-3 shrink-0 opacity-50" />
					<span>{t("title")}</span>
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
							localeStatus="source"
							proofStatus={undefined}
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">{t("sourceTitle")}</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("sourceDescription")}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							localeStatus="translated"
							proofStatus="MACHINE_DRAFT"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">
								{t("machineDraftTitle")}
							</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("machineDraftDescription")}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							localeStatus="translated"
							proofStatus="HUMAN_TOUCHED"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">
								{t("humanTouchedTitle")}
							</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("humanTouchedDescription")}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							localeStatus="translated"
							proofStatus="PROOFREAD"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">{t("proofreadTitle")}</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("proofreadDescription")}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							localeStatus="translated"
							proofStatus="VALIDATED"
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">{t("validatedTitle")}</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("validatedDescription")}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<TranslationProofStatusIcon
							localeStatus="untranslated"
							proofStatus={undefined}
						/>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">
								{t("untranslatedTitle")}
							</div>
							<div className="text-xs text-muted-foreground break-words whitespace-normal">
								{t("untranslatedDescription")}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
