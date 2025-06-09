import type { TranslationJob } from "@prisma/client";
/* useTranslationJobs.ts */
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type TranslationJobForToast = Pick<
	TranslationJob,
	"id" | "locale" | "status" | "progress" | "error"
> & {
	page: {
		slug: string;
		user: {
			handle: string;
		};
	};
};

export function useTranslationJobs(
	initial: TranslationJobForToast[],
	interval = 3000,
) {
	const ids = initial.map((j) => j.id);
	const key = ids.length
		? `/api/translation-jobs?${ids.map((id) => `id=${id}`).join("&")}`
		: null;

	const { data } = useSWR<TranslationJobForToast[]>(key, fetcher, {
		refreshInterval: (latest) =>
			latest?.every((j) => ["COMPLETED", "FAILED"].includes(j.status))
				? 0
				: interval,
		fallbackData: initial,
	});

	const allDone =
		data?.every((j) => ["COMPLETED", "FAILED"].includes(j.status)) ?? false;
	return { jobs: data ?? initial, allDone };
}
