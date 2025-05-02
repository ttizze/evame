"use client";
import { JobsView } from "@/app/[locale]/_components/jobs-view";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { TranslationJobForToast } from "./use-translation-jobs";

export function useTranslationJobToast(jobs: TranslationJobForToast[]) {
	const idRef = useRef<string | number>(undefined);
	const toastStyle = {
		unstyled: true,
		className: "w-72 rounded-xl border  p-4 shadow-xl",
	};
	/* 生成 */
	useEffect(() => {
		if (jobs.length && !idRef.current) {
			idRef.current = toast(<JobsView jobs={jobs} />, {
				duration: Number.POSITIVE_INFINITY,
				...toastStyle,
			});
		}
	}, [jobs]);

	/* 更新 */
	useEffect(() => {
		if (!idRef.current || !jobs.length) return;

		const allDone = jobs.every((j) =>
			["COMPLETED", "FAILED"].includes(j.status),
		);

		toast(<JobsView jobs={jobs} />, {
			id: idRef.current,
			duration: allDone ? 3000 : Number.POSITIVE_INFINITY,
			...toastStyle,
			classNames: {
				closeButton:
					"absolute right-2 top-2 text-muted-foreground cursor-pointer",
			},
		});
	}, [jobs]);
}
