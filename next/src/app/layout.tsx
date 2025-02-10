import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
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
						<SessionProvider>{children}</SessionProvider>
						<Toaster richColors />
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
