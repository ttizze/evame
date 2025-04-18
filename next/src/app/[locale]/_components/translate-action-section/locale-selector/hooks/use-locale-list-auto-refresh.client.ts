import type { TranslationJob } from "@prisma/client";
import { TranslationStatus } from "@prisma/client";
import { useEffect } from "react";
import { useCombinedRouter } from "../../hooks/use-combined-router";

export function useLocaleListAutoRefresh(translationJobs?: TranslationJob[]) {
	const router = useCombinedRouter();

	useEffect(() => {
		// 翻訳情報が存在しない、または全てCOMPLETEDの場合はリフレッシュ不要
		if (
			!translationJobs ||
			translationJobs.length === 0 ||
			translationJobs.every((job) => job.status === TranslationStatus.COMPLETED)
		) {
			return;
		}

		const intervalId = setInterval(() => {
			router.refresh();
		}, 5000);

		return () => clearInterval(intervalId);
	}, [translationJobs, router]);
}
