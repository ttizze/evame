import type { TranslationProofStatus } from "@prisma/client";
import { FileText, FileX, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocaleStatus } from "../lib/build-locale-options";
import { proofColorMap } from "./translation-proof-status";

interface Props {
	localeStatus: LocaleStatus;
	proofStatus?: TranslationProofStatus;
}

// 翻訳ステータス別の色マップ
const statusColorMap: Record<LocaleStatus, string> = {
	source: "text-blue-500",
	untranslated: "text-gray-400",
	translated: "text-red-500",
};

export function TranslationProofStatusIcon({
	localeStatus,
	proofStatus,
}: Props) {
	// proofStatusがない場合はMACHINE_DRAFTをデフォルトとして設定
	proofStatus = proofStatus || "MACHINE_DRAFT";

	let IconComponent: typeof FileText;
	const colorClass =
		localeStatus === "translated"
			? proofColorMap[proofStatus]
			: statusColorMap[localeStatus];

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
