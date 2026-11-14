import { WorkerEntrypoint } from "cloudflare:workers";
import type {
	ExecutionContext,
	Request as WorkerRequest,
	Response as WorkerResponse,
} from "@cloudflare/workers-types";
import {
	type CloudflareOptions,
	captureException,
	withSentry,
} from "@sentry/cloudflare";
import { isRedirect } from "@tanstack/react-router";
import handler from "@tanstack/react-start/server-entry";
import { withSecurityHeaders } from "../security-headers";
import { fetchWorker } from "../shared/fetch-worker";
import { restorePreviewRequest } from "../shared/preview-request";
import { fetchPublicReader } from "../shared/public-reader";
import { SENTRY_DSN } from "./_utils/sentry-dsn";
import { shouldInvalidateReader } from "./app/_domain/reader-cache-policy";
import { readerCacheTags } from "./app/_domain/reader-cache-tags";
import { createDb, databaseScope } from "./db";
import {
	deleteReaderCacheInvalidations,
	storeReaderCacheInvalidations,
} from "./db/mutations";
import {
	fetchReaderCacheInvalidations,
	fetchReaderChanges,
	fetchReaderRevision,
} from "./db/queries";

// HTTPルートへ公開しない、Reader専用のサービス境界。
export class ReaderBackend extends WorkerEntrypoint {
	async fetch(workerRequest: WorkerRequest): Promise<WorkerResponse> {
		const request = new Request(workerRequest.url, {
			headers: Object.fromEntries(workerRequest.headers),
		});
		const database = createDb();
		try {
			return (await databaseScope.run(database, async () => {
				const pathname = new URL(request.url).pathname;
				if (pathname === "/api/reader-data") {
					const { getReaderData } = await import(
						"./app/api/reader-data/handler"
					);
					return getReaderData(request);
				}
				return new Response(null, { status: 404 });
			})) as unknown as WorkerResponse;
		} finally {
			await database.destroy();
		}
	}
}

const sentryOptions = (env: {
	CF_VERSION_METADATA?: { id: string };
}): CloudflareOptions => ({
	dsn: process.env.SENTRY_DSN ?? SENTRY_DSN,
	release: env.CF_VERSION_METADATA?.id,
	environment: process.env.SENTRY_ENVIRONMENT ?? "production",
	tracesSampleRate: 0.2,
	beforeSend: (event, hint) =>
		isRedirect(hint.originalException) ? null : event,
});

export const GatewayMonitoring = withSentry(
	sentryOptions,
	class extends WorkerEntrypoint {
		report(error: Error, url: string, method: string) {
			captureException(error, {
				tags: { worker: "evame-gateway" },
				contexts: { request: { url, method } },
			});
		}
	},
);

export default withSentry(sentryOptions, {
	async fetch(
		request: Request,
		env: typeof import("cloudflare:workers").env,
		context: Pick<ExecutionContext, "waitUntil">,
	) {
		const restored = restorePreviewRequest(
			request,
			env.PREVIEW_GATEWAY_ORIGIN ?? null,
			env.PREVIEW_READER_SECRET ?? null,
		);
		if (!restored) return new Response(null, { status: 404 });
		request = restored;
		if (process.env.DATABASE_MIGRATION === "true") {
			return withSecurityHeaders(
				new Response(null, {
					status: 503,
					headers: { "Retry-After": "60" },
				}),
			);
		}
		const publicResponse = await fetchPublicReader(
			request,
			env.READER ?? null,
			env.SETTINGS,
			env.PREVIEW_READER_ORIGIN ?? null,
			env.PREVIEW_READER_SECRET ?? null,
		);
		if (publicResponse) return publicResponse;
		const url = new URL(request.url);
		const database = createDb();
		return databaseScope.run(database, async () => {
			try {
				const beforeRevision = shouldInvalidateReader(
					request.method,
					url.pathname,
					url.searchParams.get("action"),
					200,
					"true",
				)
					? (await fetchReaderRevision()).revision
					: null;
				const response = await handler.fetch(request);
				if (
					beforeRevision !== null &&
					shouldInvalidateReader(
						request.method,
						url.pathname,
						url.searchParams.get("action"),
						response.status,
						response.headers.get("X-Evame-Reader-Changed"),
					)
				) {
					const changes = await fetchReaderChanges(beforeRevision);
					if (changes.length > 0)
						await storeReaderCacheInvalidations(
							await readerCacheTags(changes.map((row) => row.key)),
							crypto.randomUUID(),
						);
					const pending = await fetchReaderCacheInvalidations();
					if (pending.length > 0) {
						const purged = await fetchWorker(
							new Request("https://reader.internal/__invalidate", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ tags: pending.map((row) => row.tag) }),
							}),
							env.READER ?? null,
							env.PREVIEW_READER_ORIGIN ?? null,
							env.PREVIEW_READER_SECRET ?? null,
						);
						if (!purged.ok) throw new Error("Reader cache invalidation failed");
						await deleteReaderCacheInvalidations(pending);
					}
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
});
