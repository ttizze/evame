import '../globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Viewport } from 'next';
import { BIZ_UDPGothic, Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });
const bizUDPGothic = BIZ_UDPGothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  variable: '--font-biz-udp-gothic',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-content',
};

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: 'en' }>;
}) {
  const resolvedParams = await params;

  const gaTrackingId =
    process.env.NODE_ENV === 'production'
      ? (process.env.GOOGLE_ANALYTICS_ID ?? '')
      : '';
  return (
    <html
      className={`${inter.className} ${bizUDPGothic.variable}`}
      lang={resolvedParams.locale}
      suppressHydrationWarning
    >
      <body className="antialiased transition-colors duration-300">
        {gaTrackingId && <GoogleAnalytics gaId={gaTrackingId} />}
        <NextTopLoader showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider>{children}</SessionProvider>
            <Toaster closeButton richColors />
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
