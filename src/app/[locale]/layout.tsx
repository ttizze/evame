import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type React from "react";
import { BASE_URL } from "@/app/_constants/base-url";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent.client";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
});
const cookieConsentMessageLocales = new Set(["en", "ja", "es", "ko", "zh"]);

export const metadata: Metadata = {
	metadataBase: new URL(BASE_URL),
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	interactiveWidget: "resizes-content",
};

export async function generateStaticParams() {
	return supportedLocaleOptions.map((locale) => ({
		locale: locale.code,
	}));
}

export default async function Layout(
	props: LayoutProps<"/[locale]">,
): Promise<React.ReactNode> {
	const { children, params } = props;
	const { locale } = await params;
	setRequestLocale(locale);

	const gaTrackingId = process.env.GOOGLE_ANALYTICS_ID ?? "";

	const messageLocale = cookieConsentMessageLocales.has(locale) ? locale : "en";
	const consentMessages = (
		await import(`../../../messages/${messageLocale}.json`)
	).default.CookieConsent as {
		title: string;
		description: string;
		accept: string;
		decline: string;
		privacyLink: string;
	};

	return (
		<html className={inter.variable} lang={locale} suppressHydrationWarning>
			<body className="transition-colors duration-300 antialiased">
				<AnalyticsConsent
					gaTrackingId={gaTrackingId}
					locale={locale}
					message={consentMessages}
				/>
				{/* trickle(crawl) は setTimeout ループになりやすいので無効化 */}
				<NextTopLoader crawl={false} showSpinner={false} />
				<NuqsAdapter>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						{children}
						<Toaster closeButton richColors />
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
