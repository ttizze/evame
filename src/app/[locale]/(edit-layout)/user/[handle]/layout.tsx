import { NextIntlClientProvider } from 'next-intl';
//biome-ignore lint/suspicious/useAwait: <next>
export default async function CommonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </>
  );
}
