import { routing } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

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
		<html lang={resolvedParams.locale} suppressHydrationWarning>
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
							<Footer />
						</NextIntlClientProvider>
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
