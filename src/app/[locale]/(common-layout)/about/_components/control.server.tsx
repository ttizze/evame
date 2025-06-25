import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAboutPage } from '../_lib/fetch-about-page';

const DynamicFloatingControls = dynamic(
  () =>
    import('@/app/[locale]/_components/floating-controls.client').then(
      (mod) => mod.FloatingControls
    ),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);

const DynamicPageLikeButton = dynamic(
  () =>
    import('@/app/[locale]/_components/page/page-like-button/server').then(
      (mod) => mod.PageLikeButton
    ),
  {
    loading: () => <Skeleton className="h-[845px] w-full" />,
  }
);

export default async function Control({ locale }: { locale: string }) {
  const pageWithTranslations = await fetchAboutPage(locale);
  return (
    <DynamicFloatingControls
      likeButton={
        <DynamicPageLikeButton
          className="h-10 w-10 rounded-full border"
          ownerHandle={pageWithTranslations.user.handle}
          pageId={pageWithTranslations.id}
          pageSlug={pageWithTranslations.slug}
          showCount={false}
        />
      }
    />
  );
}
