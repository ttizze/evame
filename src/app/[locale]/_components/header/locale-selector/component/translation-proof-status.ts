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

// 詳細説明マップ - 具体的な基準に基づく
export const proofDescriptionMap: Record<TranslationProofStatus, string> = {
	MACHINE_DRAFT:
		"AI-generated translation without human review. May contain errors or unnatural phrasing.",
	HUMAN_TOUCHED:
		"AI translation that has been manually edited by a human translator. Grammar and context improved.",
	PROOFREAD:
		"Translation has been reviewed for accuracy, grammar, and cultural appropriateness. Ready for final validation.",
	VALIDATED:
		"Translation has been approved by a qualified reviewer. Meets quality standards and is ready for publication.",
};
