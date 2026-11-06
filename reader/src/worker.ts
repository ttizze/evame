import { cache } from "cloudflare:workers";
import type {
	ExecutionContext,
	ScheduledController,
} from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import pLimit from "p-limit";
import { READER_PUBLICATION_CONCURRENCY } from "../../reader-publication-concurrency";
import { SENTRY_DSN } from "../../src/_utils/sentry-dsn";
import { supportedLocaleOptions } from "../../src/app/_constants/locale";
import {
	readerDocumentKey,
	readerDocumentPath,
} from "../../src/app/_domain/reader-document";
import { publishReaderDocuments } from "./publication";
import { updateReaderSources } from "./source-revisions";

const readerLocales = [
	"ja",
	...supportedLocaleOptions
		.filter((option) => option.code !== "ja")
		.map((option) => option.code),
];

/** Reader自身のスコープで無効化を確定し、失敗時に保存成功を返さない。 */
async function purgeReaderCache() {
	if (typeof cache.purge !== "function") return;
	const purged = await cache.purge({ tags: ["evame-reader"] });
	if (!purged.success) throw new Error("Reader cache invalidation failed");
}

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
			const response = await env.SELF.fetch(
				"https://reader.internal/__invalidate",
				{
					method: "POST",
				},
			);
			if (!response.ok) throw new Error("Scheduled Reader publication failed");
			await response.arrayBuffer();
		},
		async fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: ExecutionContext,
		) {
			const url = new URL(request.url);
			const sinceHeader = request.headers.get("X-Evame-Reader-Since");
			const sinceRevision = sinceHeader === null ? null : Number(sinceHeader);
			if (
				["/__invalidate", "/__publish"].includes(url.pathname) &&
				sinceRevision !== null &&
				(!Number.isSafeInteger(sinceRevision) || sinceRevision < 0)
			)
				return new Response(null, { status: 400 });
			if (url.pathname === "/__purge") {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				await purgeReaderCache();
				return new Response(null, { status: 204 });
			}
			if (
				url.pathname === "/__invalidate" &&
				request.method === "POST" &&
				!request.headers.has("X-Evame-Reader-Batch") &&
				!request.headers.has("X-Evame-Reader-Locale")
			) {
				const publicationId =
					request.headers.get("X-Evame-Reader-Publication") ??
					crypto.randomUUID();
				/** 先行バッチと後続言語で、生成ID・本文転送の完了・継続位置の判定をそろえる。 */
				async function publishBatch(locale: string) {
					const response = await env.SELF.fetch(
						"https://reader.internal/__invalidate",
						{
							method: "POST",
							headers: {
								"X-Evame-Reader-Locale": locale,
								"X-Evame-Reader-Batch": "true",
								"X-Evame-Reader-Defer-Purge": "true",
								"X-Evame-Reader-Publication": publicationId,
								...(sinceRevision === null
									? {}
									: { "X-Evame-Reader-Since": String(sinceRevision) }),
							},
						},
					);
					await response.arrayBuffer();
					if (!response.ok) throw new Error("Reader publication failed");
					return response.status === 202
						? response.headers.get("X-Evame-Reader-Locale")
						: null;
				}
				const firstBatch = publishBatch(readerLocales[0]);
				const limit = pLimit(READER_PUBLICATION_CONCURRENCY);
				const results = await Promise.allSettled(
					readerLocales.map((locale, index) =>
						limit(async () => {
							const nextLocale = await firstBatch.catch((error) => {
								if (index === 0) throw error;
								return null;
							});
							if (index === 0 && nextLocale !== locale) return;
							for (;;) {
								if ((await publishBatch(locale)) !== locale) return;
							}
						}),
					),
				);
				await purgeReaderCache();
				for (const result of results)
					if (result.status === "rejected") throw result.reason;
				return new Response(null, { status: 204 });
			}
			if (["/__invalidate", "/__publish"].includes(url.pathname)) {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				const localeIndex = readerLocales.indexOf(
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
					let readerData: Response | null = null;
					if (path !== "/404") {
						const search = new URLSearchParams(pageUrl.search);
						search.delete("view");
						const apiUrl = new URL("https://backend.internal/api/reader-data");
						apiUrl.searchParams.set("path", pageUrl.pathname);
						apiUrl.searchParams.set("search", search.toString());
						let pending = data.get(apiUrl.href);
						if (!pending) {
							// 6件並行の各3表示で使う2ページだけを保持する。
							const oldest = data.keys().next().value;
							if (data.size >= 2 && oldest !== undefined) data.delete(oldest);
							pending = env.BACKEND.fetch(apiUrl.href).then(
								async (response) => ({
									body: await response.arrayBuffer(),
									status: response.status,
								}),
							);
							data.set(apiUrl.href, pending);
						}
						const loaded = await pending;
						readerData = new Response(loaded.body.slice(0), {
							status: loaded.status,
						});
					}
					const { renderReaderRequest } = await import("./render");
					return renderReaderRequest(
						new Request(pageUrl),
						env,
						context,
						readerData,
					);
				}
				let failure: { error: unknown } | null = null;
				const publicationId =
					request.headers.get("X-Evame-Reader-Publication") ??
					crypto.randomUUID();
				let conflicts = 0;
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
							sources: Record<string, string>;
						};
						try {
							const sourceRevisions = await updateReaderSources(
								env.READER_HTML,
								catalog,
							);
							const changedSources =
								sinceRevision === null
									? null
									: new Set(
											Object.entries(sourceRevisions)
												.filter(([, revision]) => revision > sinceRevision)
												.map(([path]) => path),
										);
							result = await publishReaderDocuments(
								env.READER_HTML,
								env.CF_VERSION_METADATA.id,
								catalog,
								render,
								url.pathname === "/__publish" ? "deployment" : "content",
								locale,
								publicationId,
								changedSources,
								env.CF_VERSION_METADATA.timestamp,
							);
						} catch (error) {
							if (
								error instanceof Error &&
								error.message === "Reader publication superseded" &&
								conflicts < 4
							) {
								await new Promise((resolve) =>
									setTimeout(
										resolve,
										100 * 2 ** conflicts++ + Math.random() * 100,
									),
								);
								continue;
							}
							throw error;
						} finally {
							data.clear();
						}
						break;
					}
				} catch (error) {
					failure = { error };
				}
				const nextLocale = result?.remaining
					? readerLocales[localeIndex]
					: (readerLocales[localeIndex + 1] ?? null);
				if (
					request.headers.get("X-Evame-Reader-Defer-Purge") !== "true" &&
					(failure !== null || nextLocale === null)
				) {
					await purgeReaderCache();
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
						(!/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=[^;\s]+/.test(
							request.headers.get("Cookie") ?? "",
						) &&
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
			const { renderReaderRequest } = await import("./render");
			return renderReaderRequest(request, env, context, null);
		},
	},
);
