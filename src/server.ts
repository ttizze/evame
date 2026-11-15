import { cache, WorkerEntrypoint } from "cloudflare:workers";
import publicPages from "virtual:evame-public-pages";
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
import { getMigrationResponse } from "../shared/migration-response";
import { fetchPublicReader } from "../shared/public-reader";
import { SENTRY_DSN } from "./_utils/sentry-dsn";
import { shouldInvalidateReader } from "./app/_domain/reader-cache-policy";
import { updateReaderPublication } from "./app/_service/update-reader-publication";
import { createDb, databaseScope } from "./db";
import { fetchReaderChanges, fetchReaderRevision } from "./db/queries";

// 公開表示と編集の両方で、ストリーム完了・失敗・中断まで接続を保持する。
async function withDatabase(
	request: Request,
	context: Pick<ExecutionContext, "waitUntil">,
	fetchResponse: () => Promise<Response>,
) {
	const database = createDb();
	return databaseScope.run(database, async () => {
		try {
			const response = await fetchResponse();
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
}

// 同じWorker内の公開HTMLだけにキャッシュを適用する。RPCによる削除も同じスコープで実行する。
export class PublicPages extends WorkerEntrypoint<
	typeof import("cloudflare:workers").env
> {
	async fetch(workerRequest: WorkerRequest): Promise<WorkerResponse> {
		const migration = getMigrationResponse(process.env.DATABASE_MIGRATION);
		if (migration) return migration as unknown as WorkerResponse;
		if (new URL(workerRequest.url).pathname.startsWith("/_astro/"))
			return this.env.ASSETS.fetch(workerRequest);
		const request = workerRequest as unknown as Request;
		return withDatabase(request, this.ctx, () =>
			publicPages.fetch(request, this.env, this.ctx),
		) as unknown as Promise<WorkerResponse>;
	}

	async purge(tags: string[]) {
		if (typeof cache?.purge !== "function") return;
		for (let start = 0; start < tags.length; start += 100) {
			const result = await cache.purge({
				tags: tags.slice(start, start + 100),
			});
			if (!result.success)
				throw new Error("Public HTML cache invalidation failed");
		}
	}

	async clearCache() {
		if (typeof cache?.purge !== "function") return;
		const result = await cache.purge({ purgeEverything: true });
		if (!result.success)
			throw new Error("Public HTML cache invalidation failed");
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

export default withSentry(sentryOptions, {
	async fetch(
		request: Request,
		env: typeof import("cloudflare:workers").env,
		context: Pick<ExecutionContext, "waitUntil"> & {
			exports: {
				PublicPages: {
					fetch(request: Request): Promise<Response>;
					purge(tags: string[]): Promise<void>;
				};
			};
		},
	) {
		const migration = getMigrationResponse(process.env.DATABASE_MIGRATION);
		if (migration) return migration;
		const publicResponse = await fetchPublicReader(
			request,
			context.exports.PublicPages,
			env.SETTINGS,
		);
		if (publicResponse) return publicResponse;
		const url = new URL(request.url);
		return withDatabase(request, context, async () => {
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
				await updateReaderPublication(changes, (tags) =>
					context.exports.PublicPages.purge(tags),
				);
			}
			return response;
		});
	},
});
