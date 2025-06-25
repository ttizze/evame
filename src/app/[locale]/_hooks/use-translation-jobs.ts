import useSWR from 'swr';
import type { TranslationJobForToast } from '@/app/types/translation-job';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTranslationJobs(
  initial: TranslationJobForToast[],
  interval = 3000
) {
  const ids = initial.map((j) => j.id);
  const key = ids.length
    ? `/api/translation-jobs?${ids.map((id) => `id=${id}`).join('&')}`
    : null;

  const { data } = useSWR<TranslationJobForToast[]>(key, fetcher, {
    refreshInterval: (latest) =>
      latest?.every((j) => ['COMPLETED', 'FAILED'].includes(j.status))
        ? 0
        : interval,
    fallbackData: initial,
  });

  const allDone =
    data?.every((j) => ['COMPLETED', 'FAILED'].includes(j.status)) ?? false;

  return { toastJobs: data ?? initial, allDone };
}
