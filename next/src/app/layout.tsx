import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { BIZ_UDPGothic, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GoogleAnalytics } from "@next/third-parties/google";

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

	const gaTrackingId = process.env.NODE_ENV === "production"
		? (process.env.GOOGLE_ANALYTICS_ID ?? "")
		: "";
	return (
		<html
			lang={resolvedParams.locale}
			suppressHydrationWarning
			className={`${inter.className} ${bizUDPGothic.variable}`}
		>
			<body>
				{gaTrackingId && <GoogleAnalytics gaId={gaTrackingId} />}
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
