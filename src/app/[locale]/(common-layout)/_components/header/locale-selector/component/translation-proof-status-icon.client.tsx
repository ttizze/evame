import { FileText, FileX, Languages } from "lucide-react";
import type { TranslationProofStatus } from "@/drizzle/types";
import { cn } from "@/lib/utils";
import type { LocaleStatus } from "../domain/build-locale-options";

interface Props {
	localeStatus: LocaleStatus;
	proofStatus?: TranslationProofStatus;
}

// 統合された色マップ
const colorMap = {
	// ロケールステータス別の色
	source: "text-blue-500",
	untranslated: "text-gray-400",
	translated: "text-red-500",
	// 翻訳証明ステータス別の色
	MACHINE_DRAFT: "text-rose-500",
	HUMAN_TOUCHED: "text-orange-400",
	PROOFREAD: "text-amber-400",
	VALIDATED: "text-emerald-500",
} as const;

export function TranslationProofStatusIcon({
	localeStatus,
	proofStatus,
}: Props) {
	// proofStatusがない場合はMACHINE_DRAFTをデフォルトとして設定
	proofStatus = proofStatus || "MACHINE_DRAFT";

	let IconComponent: typeof FileText;
	const colorClass =
		localeStatus === "translated"
			? colorMap[proofStatus]
			: colorMap[localeStatus];

	switch (localeStatus) {
		case "source":
			IconComponent = FileText;
			break;
		case "untranslated":
			IconComponent = FileX;
			break;
		case "translated":
			IconComponent = Languages;
			break;
		default:
			IconComponent = FileX;
			break;
	}

	return (
		<IconComponent
			className={cn("w-4 h-4 mr-2", colorClass)}
			data-testid={`${localeStatus === "translated" ? `proof-${proofStatus}` : localeStatus}-icon`}
		/>
	);
}
