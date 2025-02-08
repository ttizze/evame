import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { getCurrentUser } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/contexts/user-context";
import { ThemeProvider } from "next-themes";
import { BIZ_UDPGothic, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

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
	const currentUser = await getCurrentUser();
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
							<UserProvider currentUser={currentUser}>{children}</UserProvider>
							<Toaster richColors />
						</NextIntlClientProvider>
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
