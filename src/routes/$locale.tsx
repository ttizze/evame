import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { supportedLocaleOptions } from "@/app/_constants/locale";
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

const syncLocaleCookie = createServerFn({ method: "GET" })
	.validator((locale: string) => locale)
	.handler(({ data: locale }) => {
		if (getCookie("NEXT_LOCALE") !== locale) {
			setCookie("NEXT_LOCALE", locale, { sameSite: "lax" });
		}
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
	beforeLoad: ({ params }) => syncLocaleCookie({ data: params.locale }),
	component: LocaleShell,
});

function LocaleShell() {
	const { locale } = Route.useParams();
	const messageLocale = locale in messages ? locale : "en";
	const localeMessages = messages[messageLocale as keyof typeof messages];

	return (
		<NextIntlClientProvider locale={locale} messages={localeMessages}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<Outlet />
				<Toaster closeButton richColors />
			</ThemeProvider>
		</NextIntlClientProvider>
	);
}
