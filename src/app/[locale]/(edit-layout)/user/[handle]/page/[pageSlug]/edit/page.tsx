import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { mdastToHtml } from '@/app/[locale]/_lib/mdast-to-html';
import { getCurrentUser } from '@/auth';
import { EditPageClient } from './_components/edit-page-client';
import {
  getAllTagsWithCount,
  getPageWithTitleAndTagsBySlug,
  getUserTargetLocales,
} from './_db/queries.server';

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

const getPageData = cache(async (handle: string, pageSlug: string) => {
  if (!(handle && pageSlug)) notFound();

  const currentUser = await getCurrentUser();
  if (currentUser?.handle !== handle || !currentUser?.id) {
    return notFound();
  }
  const [pageWithTitleAndTags, allTagsWithCount, targetLocales] =
    await Promise.all([
      getPageWithTitleAndTagsBySlug(pageSlug),
      getAllTagsWithCount(),
      getUserTargetLocales(currentUser.id),
    ]);
  const title = pageWithTitleAndTags?.pageSegments.find(
    (pageSegment) => pageSegment.number === 0
  )?.text;
  return {
    currentUser,
    pageWithTitleAndTags,
    allTagsWithCount,
    title,
    targetLocales,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle, pageSlug } = await params;
  const { title } = await getPageData(handle, pageSlug);

  return {
    title: title ? `Edit ${title}` : 'Edit Page',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditPage({ params }: { params: Params }) {
  const { locale, handle, pageSlug } = await params;
  const {
    currentUser,
    pageWithTitleAndTags,
    allTagsWithCount,
    title,
    targetLocales,
  } = await getPageData(handle, pageSlug);
  const { html } = await mdastToHtml({
    mdastJson: pageWithTitleAndTags?.mdastJson ?? {},
  });

  return (
    <EditPageClient
      allTagsWithCount={allTagsWithCount}
      currentUser={currentUser}
      html={html}
      initialTitle={title}
      pageSlug={pageSlug}
      pageWithTitleAndTags={pageWithTitleAndTags}
      targetLocales={targetLocales}
      userLocale={locale}
    />
  );
}
