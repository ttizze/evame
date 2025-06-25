import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
  fetchLatestPageTranslationJobs,
  fetchPageDetail,
  fetchPageViewCount,
} from '@/app/[locale]/_db/page-queries.server';
import { getCurrentUser } from '@/auth';
import { incrementPageView } from '../_db/mutations.server';
import { fetchLatestUserTranslationJob } from '../_db/queries.server';

export const fetchPageContext = cache(async (slug: string, locale: string) => {
  const currentUser = await getCurrentUser();

  const pageDetail = await fetchPageDetail(slug, locale, currentUser?.id);
  const titleSegment = pageDetail?.segmentBundles.find(
    (b) => b.segment.number === 0
  );
  if (!titleSegment) {
    return notFound();
  }

  const raw = titleSegment.segment.text;
  const translated =
    titleSegment.best?.text && titleSegment.best.text !== raw
      ? titleSegment.best.text
      : null;

  const title = translated ? `${raw} - ${translated}` : raw;
  if (!pageDetail || pageDetail.status === 'ARCHIVE') {
    return notFound();
  }

  await incrementPageView(pageDetail.id);

  const [pageTranslationJobs, latestUserTranslationJob, pageViewCount] =
    await Promise.all([
      fetchLatestPageTranslationJobs(pageDetail.id),
      fetchLatestUserTranslationJob(pageDetail.id, currentUser?.id ?? '0'),
      fetchPageViewCount(pageDetail.id),
    ]);

  return {
    pageDetail,
    title,
    currentUser,
    pageTranslationJobs,
    latestUserTranslationJob,
    pageViewCount,
  };
});
