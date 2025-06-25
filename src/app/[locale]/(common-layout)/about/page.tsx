import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { StartButton } from '../../_components/start-button';

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
    import(
      '@/app/[locale]/(common-layout)/about/_components/control.server'
    ).then((mod) => mod.default),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);
export const metadata: Metadata = {
  title: 'Evame - About',
  description:
    'Evame is an open-source platform for collaborative article translation and sharing.',
};
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  const locales = ['en', 'ja', 'zh', 'ko', 'es'];

  return locales.map((locale) => ({
    locale,
  }));
}
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex flex-col">
      <DynamicHeroSection locale={locale} />
      <DynamicProblemSolutionSection locale={locale} />
      <div className="mt-10 mb-32 flex justify-center">
        <StartButton className="h-12 w-60 text-xl" text="Get Started" />
      </div>
      <DynamicControl locale={locale} />
    </div>
  );
}
