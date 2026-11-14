import { cache } from "cloudflare:workers";
import { cf, finalize } from "@astrojs/cloudflare/fetch";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import { astro, FetchState } from "astro/fetch";
import { restorePreviewRequest } from "../../shared/preview-request";
import { SENTRY_DSN } from "../../src/_utils/sentry-dsn";

export default withSentry(
	(env) => ({
		dsn: process.env.SENTRY_DSN ?? SENTRY_DSN,
		release: env.CF_VERSION_METADATA?.id,
		environment: process.env.SENTRY_ENVIRONMENT ?? "production",
		tracesSampleRate: 0.2,
	}),
	{
		async fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: ExecutionContext,
		) {
			const restored = restorePreviewRequest(
				request,
				env.PREVIEW_GATEWAY_ORIGIN ?? null,
				env.PREVIEW_READER_SECRET ?? null,
			);
			if (!restored) return new Response(null, { status: 404 });
			request = restored;
			const pathname = new URL(request.url).pathname;
			if (pathname === "/__invalidate" || pathname === "/__purge") {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				// 無本文の旧Gatewayとデプロイ時の全体無効化を受け付ける。
				const payload = await request.text();
				const tags: unknown = payload
					? JSON.parse(payload).tags
					: ["evame-reader"];
				if (
					!Array.isArray(tags) ||
					(payload !== "" &&
						tags.some(
							(tag) =>
								typeof tag !== "string" || !/^reader:[a-f0-9]{64}$/.test(tag),
						))
				)
					return new Response(null, { status: 400 });
				if (!env.PREVIEW_GATEWAY_ORIGIN && typeof cache?.purge === "function") {
					for (let start = 0; start < tags.length; start += 100) {
						const result = await cache.purge({
							tags: tags.slice(start, start + 100),
						});
						if (!result.success)
							throw new Error("Reader cache invalidation failed");
					}
				}
				return new Response(null, { status: 204 });
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
