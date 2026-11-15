import { cache } from "cloudflare:workers";
import { cf, finalize } from "@astrojs/cloudflare/fetch";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import { astro, FetchState } from "astro/fetch";
import { restorePreviewRequest } from "../../shared/preview-request";
import { SENTRY_DSN } from "../../src/_utils/sentry-dsn";
import {
	deletePublishedHtml,
	invalidatePublishedHtml,
	servePublishedHtml,
} from "./infra/published-html";

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
			const render = async (input: Request) => {
				const state = new FetchState(input);
				const asset = await cf(state, env, context);
				if (asset) return asset;
				const response = finalize(state, await astro(state));
				response.headers.set("X-Evame-HTML", "dynamic");
				return response;
			};
			const pathname = new URL(request.url).pathname;
			if (
				pathname === "/__publication-cleanup" &&
				env.PREVIEW_GATEWAY_ORIGIN &&
				env.READER_PUBLICATION_PREFIX &&
				env.HTML
			) {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				await deletePublishedHtml(env.HTML, env.READER_PUBLICATION_PREFIX);
				return new Response(null, { status: 204 });
			}
			if (pathname === "/__invalidate" || pathname === "/__purge") {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				// 無本文の旧Gatewayとデプロイ時の全体無効化を受け付ける。
				const payload = await request.text();
				const parsed = payload ? JSON.parse(payload) : null;
				const tags: unknown = parsed ? parsed.tags : ["evame-reader"];
				if (
					!Array.isArray(tags) ||
					(payload !== "" &&
						tags.some(
							(tag) =>
								typeof tag !== "string" || !/^reader:[a-f0-9]{64}$/.test(tag),
						))
				)
					return new Response(null, { status: 400 });
				if (env.READER_PUBLICATION_PREFIX) {
					if (!env.HTML) throw new Error("Publication R2 binding is required");
					if (
						!Number.isSafeInteger(parsed?.revision) ||
						parsed.revision < 0 ||
						!Array.isArray(parsed.paths) ||
						parsed.paths.some(
							(path: unknown) =>
								typeof path !== "string" ||
								!path.startsWith("/") ||
								path.startsWith("//"),
						)
					)
						return new Response(null, { status: 400 });
					await invalidatePublishedHtml(
						env.HTML,
						env.READER_PUBLICATION_PREFIX,
						tags,
						parsed.revision,
					);
					for (const path of new Set<string>(parsed.paths)) {
						const generated = await servePublishedHtml(
							new Request(new URL(path, request.url)),
							env.HTML,
							env.READER_PUBLICATION_PREFIX,
							render,
						);
						if (generated.status !== 200 && generated.status !== 404)
							throw new Error("公開HTMLの生成に失敗しました");
						await generated.body?.cancel();
					}
				}
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
			if (env.READER_PUBLICATION_PREFIX) {
				if (!env.HTML) throw new Error("Publication R2 binding is required");
				return servePublishedHtml(
					request,
					env.HTML,
					env.READER_PUBLICATION_PREFIX,
					render,
				);
			}
			return render(request);
		},
	},
);
