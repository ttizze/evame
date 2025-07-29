import { cn } from "@/lib/utils";
import type { TranslationProofStatus } from "@prisma/client";
import { FileText, FileX, Languages } from "lucide-react";
import type { LocaleStatus } from "../lib/build-locale-options";
import { proofColorMap } from "./translation-proof-status";

interface Props {
	status: LocaleStatus;
	proofStatus?: TranslationProofStatus;
}

// 翻訳ステータス別の色マップ
const statusColorMap: Record<LocaleStatus, string> = {
	source: "text-blue-500",
	untranslated: "text-gray-400",
	translated: "text-green-500",
};

export function TranslationProofStatusIcon({ status, proofStatus }: Props) {
	// 翻訳済みでプルーフステータスがある場合はプルーフステータスを表示
	if (status === "translated" && proofStatus) {
		return (
			<Languages
				className={cn("w-4 h-4 mr-2", proofColorMap[proofStatus])}
				data-testid={`proof-${proofStatus}-icon`}
			/>
		);
	}

	// 翻訳ステータスを表示（原文、未翻訳、翻訳済みだがプルーフステータスがない場合）
	let IconComponent: typeof FileText;
	const colorClass = statusColorMap[status];

	switch (status) {
		case "source":
			IconComponent = FileText;
			break;

		case "untranslated":
			IconComponent = FileX;
			break;

		default:
			IconComponent = Languages;
			break;
	}

	return (
		<IconComponent
			className={cn("w-4 h-4 mr-2", colorClass)}
			data-testid={`${status}-icon`}
		/>
	);
}
