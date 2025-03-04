import type { PageAITranslationInfo } from "@prisma/client";
import { TranslationStatus } from "@prisma/client";
import { useEffect } from "react";
import { useCombinedRouter } from "../../hooks/use-combined-router";

export function useLocaleListAutoRefresh(
	pageAITranslationInfo?: PageAITranslationInfo[],
) {
	const router = useCombinedRouter();

	useEffect(() => {
		// 翻訳情報が存在しない、または全てCOMPLETEDの場合はリフレッシュ不要
		if (
			!pageAITranslationInfo ||
			pageAITranslationInfo.length === 0 ||
			pageAITranslationInfo.every(
				(info) => info.aiTranslationStatus === TranslationStatus.COMPLETED,
			)
		) {
			return;
		}

		const intervalId = setInterval(() => {
			router.refresh();
		}, 5000);

		return () => clearInterval(intervalId);
	}, [pageAITranslationInfo, router]);
}
