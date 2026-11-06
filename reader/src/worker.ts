import { cache } from "cloudflare:workers";
import { cf, finalize } from "@astrojs/cloudflare/fetch";
import type {
	ExecutionContext,
	ScheduledController,
} from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import { astro, FetchState } from "astro/fetch";
import { SENTRY_DSN } from "../../src/_utils/sentry-dsn";
import { supportedLocaleOptions } from "../../src/app/_constants/locale";
import {
	readerDocumentKey,
	readerDocumentPath,
} from "../../src/app/_domain/reader-document";
import { publishReaderDocuments } from "./publication";

declare const __READER_BUILD_ID__: string;
const readerLocales = [
	"ja",
	...supportedLocaleOptions
		.filter((option) => option.code !== "ja")
		.map((option) => option.code),
];

export default withSentry(
	(env) => ({
		dsn: env.SENTRY_DSN ?? SENTRY_DSN,
		release: env.CF_VERSION_METADATA?.id,
		environment: "production",
		tracesSampleRate: 0.2,
	}),
	{
		async scheduled(
			_controller: ScheduledController,
			env: typeof import("cloudflare:workers").env,
		) {
			let locale: string | null = null;
			for (;;) {
				const response = await env.SELF.fetch(
					"https://reader.internal/__invalidate",
					{
						method: "POST",
						headers: {
							"X-Evame-Reader-Batch": "true",
							...(locale ? { "X-Evame-Reader-Locale": locale } : {}),
						},
					},
				);
				if (!response.ok)
					throw new Error("Scheduled Reader publication failed");
				if (response.status !== 202) return;
				locale = response.headers.get("X-Evame-Reader-Locale");
			}
		},
		async fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: ExecutionContext,
		) {
			const url = new URL(request.url);
			if (["/__invalidate", "/__publish"].includes(url.pathname)) {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				let localeIndex = readerLocales.indexOf(
					request.headers.get("X-Evame-Reader-Locale") ?? readerLocales[0],
				);
				if (localeIndex < 0) return new Response(null, { status: 400 });
				let result: Awaited<ReturnType<typeof publishReaderDocuments>> | null =
					null;
				const data = new Map<
					string,
					Promise<{ body: ArrayBuffer; status: number }>
				>();
				async function render(path: string) {
					const pageUrl = new URL(path, "https://evame.tech");
					const state = new FetchState(new Request(pageUrl));
					if (path !== "/404") {
						const search = new URLSearchParams(pageUrl.search);
						search.delete("view");
						const apiUrl = new URL("https://backend.internal/api/reader-data");
						apiUrl.searchParams.set("path", pageUrl.pathname);
						apiUrl.searchParams.set("search", search.toString());
						let pending = data.get(apiUrl.href);
						if (!pending) {
							pending = env.BACKEND.fetch(apiUrl.href).then(
								async (response) => ({
									body: await response.arrayBuffer(),
									status: response.status,
								}),
							);
							data.set(apiUrl.href, pending);
						}
						const loaded = await pending;
						state.locals.readerData = new Response(loaded.body.slice(0), {
							status: loaded.status,
						});
					}
					const asset = await cf(state, env, context);
					return asset ?? finalize(state, await astro(state));
				}
				let failure: { error: unknown } | null = null;
				try {
					for (;;) {
						const locale = readerLocales[localeIndex];
						const response = await env.BACKEND.fetch(
							`https://backend.internal/__catalog?locale=${locale}`,
						);
						if (!response.ok) throw new Error("Reader catalog unavailable");
						const catalog = (await response.json()) as {
							revision: number;
							documents: Record<string, string>;
						};
						try {
							result = await publishReaderDocuments(
								env.READER_HTML,
								__READER_BUILD_ID__,
								catalog,
								render,
								url.pathname === "/__publish" ? "deployment" : "content",
								locale,
							);
						} catch (error) {
							if (
								error instanceof Error &&
								error.message === "Reader publication superseded"
							)
								continue;
							throw error;
						} finally {
							data.clear();
						}
						if (
							url.pathname === "/__publish" ||
							request.headers.get("X-Evame-Reader-Batch") === "true"
						)
							break;
						if (result.remaining === 0) {
							if (localeIndex === readerLocales.length - 1) break;
							localeIndex++;
						}
					}
				} catch (error) {
					failure = { error };
				}
				const nextLocale = result?.remaining
					? readerLocales[localeIndex]
					: (readerLocales[localeIndex + 1] ?? null);
				if (
					typeof cache.purge === "function" &&
					(failure !== null || nextLocale === null)
				) {
					const purged = await cache.purge({ tags: ["evame-reader"] });
					if (!purged.success)
						throw new Error("Reader cache invalidation failed");
				}
				if (failure !== null) throw failure.error;
				return url.pathname === "/__invalidate"
					? new Response(null, {
							status: nextLocale === null ? 204 : 202,
							headers: nextLocale
								? { "X-Evame-Reader-Locale": nextLocale }
								: {},
						})
					: Response.json({ ...result, nextLocale });
			}
			const path = readerDocumentPath(url.pathname, url.search);
			if (path && (request.method === "GET" || request.method === "HEAD")) {
				const object = await env.READER_HTML.get(readerDocumentKey(path));
				if (
					object &&
					(object.customMetadata?.status !== "404" ||
						(!request.headers.has("Cookie") &&
							!request.headers.has("Authorization")))
				) {
					const supportsCache =
						typeof cache.purge === "function" &&
						object.customMetadata?.status === "200";
					return new Response(
						request.method === "HEAD"
							? null
							: (object.body as unknown as ReadableStream),
						{
							status: Number(object.customMetadata?.status ?? 200),
							headers: {
								"Content-Type": "text/html; charset=utf-8",
								"Cache-Control": supportsCache
									? "public, max-age=0, must-revalidate"
									: "private, no-store",
								...(supportsCache
									? {
											"Cloudflare-CDN-Cache-Control": "public, max-age=3600",
											"Cache-Tag": "evame-reader",
										}
									: {}),
								"X-Evame-HTML": "generated",
							},
						},
					);
				}
			}
			const state = new FetchState(request);
			const asset = await cf(state, env, context);
			if (asset) return asset;
			const response = finalize(state, await astro(state));
			response.headers.set("X-Evame-HTML", "dynamic");
			return response;
		},
	},
);
