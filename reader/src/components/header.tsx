import "../../../src/instrument.client";
import { ThemeProvider } from "next-themes";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent.client";
import { HeaderFrame } from "@/app/[locale]/(common-layout)/_components/header";
import { HeaderUserSlot } from "@/app/[locale]/(common-layout)/_components/header/user-slot.client";
import { Toaster } from "@/components/ui/sonner";
import { messages } from "@/i18n/messages";
import { BlogHeader } from "./blog-header";
import { IslandProviders } from "./providers";

export function HeaderIsland({
	locale,
	search,
	gaTrackingId,
	showHeader,
	blog,
}: {
	locale: string;
	search: string;
	gaTrackingId: string;
	showHeader: boolean;
	blog: { handle: string; name: string; image: string | null } | null;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				{showHeader &&
					(blog ? (
						<BlogHeader
							handle={blog.handle}
							image={blog.image}
							locale={locale}
							name={blog.name}
						/>
					) : (
						<HeaderFrame
							locale={locale}
							userSlot={<HeaderUserSlot locale={locale} />}
						/>
					))}
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
