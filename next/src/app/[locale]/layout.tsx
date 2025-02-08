import { routing } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { BIZ_UDPGothic, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

const inter = Inter({ subsets: ["latin"] });
const bizUDPGothic = BIZ_UDPGothic({
	weight: ["400", "700"],
	subsets: ["latin"],
	preload: true,
	display: "swap",
	variable: "--font-biz-udp-gothic",
});
export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: "en" }>;
}) {
	const resolvedParams = await params;
	// Ensure that the incoming `locale` is valid
	if (!routing.locales.includes(resolvedParams.locale)) {
		notFound();
	}

	// Providing all messages to the client
	// side is the easiest way to get started
	const messages = await getMessages();
	return (
		<html
			lang={resolvedParams.locale}
			suppressHydrationWarning
			className={`${inter.className} ${bizUDPGothic.variable}`}
		>
			<body>
				<NuqsAdapter>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<NextIntlClientProvider messages={messages}>
							<Header />
							<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
								<div className="mx-auto px-2 max-w-4xl">{children}</div>
							</main>
							<Toaster richColors />
							<Footer />
						</NextIntlClientProvider>
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
