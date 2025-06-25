import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { SearchParams } from 'nuqs/server';
import { createLoader, parseAsString } from 'nuqs/server';
import { getCurrentUser } from '@/auth';
import { Skeleton } from '@/components/ui/skeleton';

const PopularPageList = dynamic(
  () => import('@/app/[locale]/_components/page/popular-page-list/server'),
  {
    loading: () => <Skeleton className="mb-10 h-[400px] w-full" />,
  }
);

const PopularPageTagsList = dynamic(
  () => import('@/app/[locale]/_components/page/popular-page-tags-list/server'),
  {
    loading: () => <Skeleton className="mb-6 h-[100px] w-full" />,
  }
);

const NewPageList = dynamic(
  () => import('@/app/[locale]/_components/page/new-page-list/server'),
  {
    loading: () => <Skeleton className="mb-10 h-[400px] w-full" />,
  }
);

const SortTabs = dynamic(
  () =>
    import('@/app/[locale]/_components/sort-tabs').then((mod) => mod.SortTabs),
  {
    loading: () => <Skeleton className="mb-4 h-[50px] w-full" />,
  }
);
const PopularUsersList = dynamic(
  () => import('@/app/[locale]/_components/user/popular-users-list/server'),
  {
    loading: () => <Skeleton className="mb-6 h-[200px] w-full" />,
  }
);
const DynamicHeroSection = dynamic(
  () => import('@/app/[locale]/_components/hero-section/server'),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);

const DynamicProblemSolutionSection = dynamic(
  () =>
    import(
      '@/app/[locale]/_components/top-page/problem-solution-section/server'
    ),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);

const DynamicControl = dynamic(
  () =>
    import('@/app/[locale]/_components/top-page/top-page-control.server').then(
      (mod) => mod.default
    ),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);

import { StartButton } from '@/app/[locale]/_components/start-button';

const NewPageListByTag = dynamic(
  () => import('@/app/[locale]/_components/page/new-page-list-by-tag/server'),
  {
    loading: () => <Skeleton className="mb-10 h-[400px] w-full" />,
  }
);

export const metadata: Metadata = {
  title: 'Evame - Home - Latest Pages',
  description:
    'Evame is an open-source platform for collaborative article translation and sharing.',
};

const searchParamsSchema = {
  tab: parseAsString.withDefault('home'),
  sort: parseAsString.withDefault('popular'),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await getCurrentUser();
  const { locale } = await params;
  const { sort } = await loadSearchParams(searchParams);
  return (
    <div className="mb-12 flex flex-col justify-between gap-8">
      {!currentUser && (
        <>
          <DynamicHeroSection locale={locale} />
          <DynamicProblemSolutionSection locale={locale} />
          <div className="mt-10 mb-32 flex justify-center">
            <StartButton className="h-12 w-60 text-xl" text="Get Started" />
          </div>
        </>
      )}
      <DynamicControl />
      <NewPageList locale={locale} searchParams={searchParams} />
      <NewPageListByTag locale={locale} tagName="AI" />
      <NewPageListByTag locale={locale} tagName="Programming" />
      <NewPageListByTag locale={locale} tagName="Plurality" />
    </div>
  );
}
