import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { TranslationJob } from "@/db/types.helpers";

export function useLocaleListAutoRefresh(translationJobs?: TranslationJob[]) {
	const router = useRouter();

	useEffect(() => {
		// 翻訳情報が存在しない、または全て終了状態（COMPLETED/FAILED）の場合、リフレッシュ不要
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
			void router.invalidate();
		}, 5000);

		return () => clearInterval(intervalId);
	}, [translationJobs, router]);
}
