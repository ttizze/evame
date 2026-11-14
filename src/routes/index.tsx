import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequestHeader,
	setCookie,
} from "@tanstack/react-start/server";
import { resolveRootLocale } from "@/app/_domain/root-locale";

const getLocale = createServerFn({ method: "GET" }).handler(() => {
	const cookieLocale = getCookie("NEXT_LOCALE");
	const locale = resolveRootLocale(
		cookieLocale,
		getRequestHeader("accept-language") ?? null,
	);
	if (cookieLocale !== undefined && cookieLocale !== locale)
		setCookie("NEXT_LOCALE", locale, { sameSite: "lax" });
	return locale;
});
export const Route = createFileRoute("/")({
	beforeLoad: async ({ location }) => {
		const locale = await getLocale();
		throw redirect({
			to: "/$locale",
			params: { locale },
			search: location.search,
		});
	},
});
