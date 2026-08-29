import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { IntlProvider } from "use-intl";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent.client";
import { Toaster } from "@/components/ui/sonner";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import jaMessages from "../../messages/ja.json";
import koMessages from "../../messages/ko.json";
import zhMessages from "../../messages/zh.json";

const locales = supportedLocaleOptions.map((locale) => locale.code);
const messages = {
	en: enMessages,
	es: esMessages,
	ja: jaMessages,
	ko: koMessages,
	zh: zhMessages,
};
const cookieConsentMessageLocales = new Set(["en", "ja", "es", "ko", "zh"]);

const loadLocaleRuntimeData = createServerFn({ method: "GET" })
	.validator((locale: string) => locale)
	.handler(({ data: locale }) => {
		if (getCookie("NEXT_LOCALE") !== locale) {
			setCookie("NEXT_LOCALE", locale, { sameSite: "lax" });
		}

		return { gaTrackingId: process.env.GOOGLE_ANALYTICS_ID ?? "" };
	});

export const Route = createFileRoute("/$locale")({
	params: {
		parse: (params) => {
			if (!locales.includes(params.locale)) {
				throw notFound();
			}

			return params;
		},
	},
	loader: ({ params }) => loadLocaleRuntimeData({ data: params.locale }),
	component: LocaleShell,
});

function LocaleShell() {
	const { locale } = Route.useParams();
	const { gaTrackingId } = Route.useLoaderData();
	const messageLocale = locale in messages ? locale : "en";
	const localeMessages = messages[messageLocale as keyof typeof messages];
	const consentMessageLocale = cookieConsentMessageLocales.has(locale)
		? locale
		: "en";
	const consentMessages =
		messages[consentMessageLocale as keyof typeof messages].CookieConsent;

	return (
		<IntlProvider locale={locale} messages={localeMessages}>
			<NuqsAdapter>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<AnalyticsConsent
						gaTrackingId={gaTrackingId}
						locale={locale}
						message={consentMessages}
					/>
					<Outlet />
					<Toaster closeButton richColors />
				</ThemeProvider>
			</NuqsAdapter>
		</IntlProvider>
	);
}
