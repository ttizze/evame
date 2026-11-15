import type { KVNamespace } from "@cloudflare/workers-types";
import { withSecurityHeaders } from "../security-headers";
import { getLocaleCookie } from "../src/_utils/locale-cookie";
import { parseReaderRoute } from "../src/app/_domain/reader-route";
import { resolveRootLocale } from "../src/app/_domain/root-locale";
import {
	getMaintenancePath,
	shouldCheckMaintenance,
} from "../src/maintenance-gate";

// 公開HTMLのloopbackと編集・APIを振り分け、利用者ごとのヘッダーは外側で付ける。
export async function fetchPublicReader(
	request: Request,
	reader: { fetch(request: Request): Promise<Response> },
	settings: KVNamespace,
): Promise<Response | null> {
	const url = new URL(request.url);
	if (
		(url.pathname.startsWith("/_astro/") ||
			url.pathname === "/api/home-feed") &&
		(request.method === "GET" || request.method === "HEAD")
	) {
		return withSecurityHeaders(await reader.fetch(request));
	}
	const readerRoute = parseReaderRoute(url.pathname, url.search);
	const pathname =
		readerRoute?.kind === "home" ? `/${readerRoute.locale}` : url.pathname;
	if (shouldCheckMaintenance(pathname)) {
		const isOn = await settings.get<boolean>("maintenance", "json");
		if (isOn) {
			return withSecurityHeaders(
				Response.redirect(
					new URL(
						getMaintenancePath({
							pathname,
							cookieHeader: request.headers.get("cookie"),
							acceptLanguage: request.headers.get("accept-language"),
						}),
						request.url,
					),
					307,
				),
			);
		}
	}
	if (readerRoute && (request.method === "GET" || request.method === "HEAD")) {
		const readerUrl = new URL(request.url);
		if (readerRoute.kind === "home")
			readerUrl.pathname = `/${readerRoute.locale}`;
		const response = await reader.fetch(new Request(readerUrl, request));
		const secured = withSecurityHeaders(response);
		secured.headers.set("Cache-Control", "private, no-store");
		secured.headers.delete("Cloudflare-CDN-Cache-Control");
		secured.headers.delete("Cache-Tag");
		secured.headers.append(
			"Set-Cookie",
			`NEXT_LOCALE=${readerRoute.locale}; Path=/; SameSite=Lax`,
		);
		return secured;
	}
	if (
		url.pathname === "/" &&
		(request.method === "GET" || request.method === "HEAD")
	) {
		const cookieLocale = getLocaleCookie(request.headers.get("cookie"));
		const locale = resolveRootLocale(
			cookieLocale,
			request.headers.get("accept-language"),
		);
		const headers = new Headers({
			Location: `/${locale}${url.search}`,
			"Cache-Control": "private, no-store",
		});
		if (cookieLocale !== undefined && cookieLocale !== locale)
			headers.append(
				"Set-Cookie",
				`NEXT_LOCALE=${locale}; Path=/; SameSite=Lax`,
			);
		return withSecurityHeaders(new Response(null, { status: 307, headers }));
	}
	return null;
}
