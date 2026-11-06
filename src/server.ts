import type { ExecutionContext } from "@cloudflare/workers-types";
import { captureException, withSentry } from "@sentry/cloudflare";
import { isRedirect } from "@tanstack/react-router";
import handler from "@tanstack/react-start/server-entry";
import { withSecurityHeaders } from "../security-headers";
import { SENTRY_DSN } from "./_utils/sentry-dsn";
import { shouldInvalidateReader } from "./app/_domain/reader-cache-policy";
import { parseReaderRoute } from "./app/_domain/reader-route";
import { createDb, databaseScope } from "./db";
import { getMaintenancePath, shouldCheckMaintenance } from "./maintenance-gate";

export default withSentry(
	(env) => ({
		dsn: process.env.SENTRY_DSN ?? SENTRY_DSN,
		release: env.CF_VERSION_METADATA?.id,
		environment: process.env.SENTRY_ENVIRONMENT ?? "production",
		tracesSampleRate: 0.2,
		beforeSend: (event, hint) =>
			isRedirect(hint.originalException) ? null : event,
	}),
	{
		async fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: Pick<ExecutionContext, "waitUntil">,
		) {
			if (process.env.DATABASE_MIGRATION === "true") {
				return withSecurityHeaders(
					new Response(null, {
						status: 503,
						headers: { "Retry-After": "60" },
					}),
				);
			}
			const url = new URL(request.url);
			const readerRoute = parseReaderRoute(url.pathname, url.search);
			const pathname =
				readerRoute?.kind === "home" ? `/${readerRoute.locale}` : url.pathname;
			if (shouldCheckMaintenance(pathname)) {
				const isOn = await env.SETTINGS.get<boolean>("maintenance", "json");
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
			if (
				readerRoute &&
				(request.method === "GET" || request.method === "HEAD")
			) {
				const readerUrl = new URL(request.url);
				if (readerRoute.kind === "home")
					readerUrl.pathname = `/${readerRoute.locale}`;
				const response = (await env.READER.fetch(readerUrl.href, {
					method: request.method,
					headers: Object.fromEntries(request.headers),
				})) as unknown as Response;
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
			const database = createDb();
			return databaseScope.run(database, async () => {
				try {
					const response = await handler.fetch(request);
					if (
						shouldInvalidateReader(
							request.method,
							url.pathname,
							url.searchParams.get("action"),
							response.status,
							response.headers.get("X-Evame-Reader-Changed"),
						)
					) {
						const purged = await env.READER.fetch(
							"https://reader.internal/__invalidate",
							{ method: "POST" },
						);
						if (!purged.ok) throw new Error("Reader cache invalidation failed");
					}
					const init = {
						status: response.status,
						statusText: response.statusText,
						headers: new Headers(response.headers),
					};
					init.headers.delete("X-Evame-Reader-Changed");
					if (!response.body) {
						await database.destroy();
						return withSecurityHeaders(new Response(null, init));
					}
					const stream = new TransformStream();
					context.waitUntil(
						response.body
							.pipeTo(stream.writable)
							.catch((error) => {
								if (
									error !== undefined &&
									!request.signal.aborted &&
									!(error instanceof Error && error.name === "AbortError")
								)
									captureException(error);
							})
							.finally(() => database.destroy()),
					);
					return withSecurityHeaders(new Response(stream.readable, init));
				} catch (error) {
					await database.destroy();
					throw error;
				}
			});
		},
	},
);
