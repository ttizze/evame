import type { TranslationProofStatus } from "@prisma/client";
export const proofColorMap: Record<TranslationProofStatus, string> = {
	MACHINE_DRAFT: "text-rose-500",
	HUMAN_TOUCHED: "text-orange-400",
	PROOFREAD: "text-amber-400",
	VALIDATED: "text-emerald-500",
};

export const proofLabelMap: Record<TranslationProofStatus, string> = {
	MACHINE_DRAFT: "Machine draft",
	HUMAN_TOUCHED: "Human touched",
	PROOFREAD: "Proofread",
	VALIDATED: "Validated",
};
