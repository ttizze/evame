import { useEffect } from "react";
import type { TranslationJobs } from "@/db/types";
import { useCombinedRouter } from "./use-combined-router";

export function useLocaleListAutoRefresh(translationJobs?: TranslationJobs[]) {
	const router = useCombinedRouter();

	useEffect(() => {
		// 翻訳情報が存在しない、または全て終了状態（COMPLETED/FAILED）の場合はリフレッシュ不要
		if (
			!translationJobs ||
			translationJobs.length === 0 ||
			!translationJobs.some(
				(job) => job.status === "PENDING" || job.status === "IN_PROGRESS",
			)
		) {
			return;
		}

		const intervalId = setInterval(() => {
			router.refresh();
		}, 5000);

		return () => clearInterval(intervalId);
	}, [translationJobs, router]);
}
