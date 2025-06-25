import dynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { DisplayProvider } from '@/app/_context/display-provider';
import { Footer } from '@/app/[locale]/_components/footer';
import { Skeleton } from '@/components/ui/skeleton';

const Header = dynamic(
  () =>
    import('@/app/[locale]/_components/header/server').then(
      (mod) => mod.Header
    ),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
  }
);

export default async function CommonLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const { locale } = await params;

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        <DisplayProvider initialSourceLocale="mixed" userLocale={locale}>
          <Header />
          <main className="mt-3 mb-5 grow tracking-wider md:mt-5">
            <div className="container mx-auto max-w-4xl px-4">{children}</div>
          </main>
          <Footer />
        </DisplayProvider>
      </NextIntlClientProvider>
    </>
  );
}
