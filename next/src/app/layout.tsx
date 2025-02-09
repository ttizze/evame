import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { BIZ_UDPGothic, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { setGuestId } from "@/lib/guest-id-action";
const inter = Inter({ subsets: ["latin"] });
const bizUDPGothic = BIZ_UDPGothic({
	weight: ["400", "700"],
	subsets: ["latin"],
	preload: true,
	display: "swap",
	variable: "--font-biz-udp-gothic",
});
export default async function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: "en" }>;
}) {
	const resolvedParams = await params;
	const messages = await getMessages();
	await setGuestId();
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
							<SessionProvider>{children}</SessionProvider>
							<Toaster richColors />
						</NextIntlClientProvider>
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
