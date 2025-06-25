import type { TranslationJob, TranslationStatus } from '@prisma/client';

const SCORE: Record<TranslationStatus, number> = {
  COMPLETED: 3,
  IN_PROGRESS: 2,
  PENDING: 1,
  FAILED: 0,
};
export function pickBestPerLocale(jobs: TranslationJob[]): TranslationJob[] {
  const map = new Map<string, TranslationJob>();

  for (const job of jobs) {
    const current = map.get(job.locale);
    if (
      !current ||
      SCORE[job.status] > SCORE[current.status] ||
      (SCORE[job.status] === SCORE[current.status] &&
        job.updatedAt > current.updatedAt)
    ) {
      map.set(job.locale, job);
    }
  }
  return [...map.values()];
}
