"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	isTranslationJobTerminalStatus,
	type TranslationJobForToast,
} from "@/app/types/translation-job";
import { JobsView } from "./jobs-view";

const areJobsDone = (jobs: TranslationJobForToast[]) =>
	jobs.every((job) => isTranslationJobTerminalStatus(job.status));

export function useTranslationJobToast(jobs: TranslationJobForToast[]) {
	const idRef = useRef<string | number>(undefined);
	const toastStyle = {
		unstyled: true,
		className: "w-72 rounded-xl border  p-4 shadow-xl",
	};
	// 生成
	useEffect(() => {
		if (jobs.length && !idRef.current) {
			idRef.current = toast(<JobsView jobs={jobs} />, {
				duration: Number.POSITIVE_INFINITY,
				...toastStyle,
			});
		}
	}, [jobs]);

	// 更新
	useEffect(() => {
		if (!idRef.current || !jobs.length) return;

		toast(<JobsView jobs={jobs} />, {
			id: idRef.current,
			duration: areJobsDone(jobs) ? 3000 : Number.POSITIVE_INFINITY,
			...toastStyle,
			classNames: {
				closeButton:
					"absolute right-2 top-2 text-muted-foreground cursor-pointer",
			},
		});
	}, [jobs]);

	// 全完了後に ID をクリア
	useEffect(() => {
		if (!idRef.current) return;
		if (areJobsDone(jobs)) {
			const t = setTimeout(() => {
				idRef.current = undefined;
			}, 3100);
			return () => clearTimeout(t);
		}
	}, [jobs]);
}
