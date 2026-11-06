import "../../../src/instrument.client";
import { ThemeProvider } from "next-themes";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent.client";
import { HeaderFrame } from "@/app/[locale]/(common-layout)/_components/header";
import { HeaderUserSlot } from "@/app/[locale]/(common-layout)/_components/header/user-slot.client";
import { Toaster } from "@/components/ui/sonner";
import { messages } from "@/i18n/messages";
import { IslandProviders } from "./providers";

export function HeaderIsland({
	locale,
	gaTrackingId,
}: {
	locale: string;
	gaTrackingId: string;
}) {
	return (
		<IslandProviders locale={locale}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<HeaderFrame
					locale={locale}
					userSlot={<HeaderUserSlot locale={locale} />}
				/>
				<AnalyticsConsent
					gaTrackingId={gaTrackingId}
					locale={locale}
					message={
						(messages[locale as keyof typeof messages] ?? messages.en)
							.CookieConsent
					}
				/>
				<Toaster closeButton richColors />
			</ThemeProvider>
		</IslandProviders>
	);
}
