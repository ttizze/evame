import { cache } from "cloudflare:workers";
import { cf, finalize } from "@astrojs/cloudflare/fetch";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import { astro, FetchState } from "astro/fetch";
import { SENTRY_DSN } from "../../src/_utils/sentry-dsn";

export default withSentry(
	(env) => ({
		dsn: env.SENTRY_DSN ?? SENTRY_DSN,
		release: env.CF_VERSION_METADATA?.id,
		environment: "production",
		tracesSampleRate: 0.2,
	}),
	{
		async fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: ExecutionContext,
		) {
			if (new URL(request.url).pathname === "/__invalidate") {
				if (request.method !== "POST")
					return new Response(null, { status: 405 });
				if (typeof cache.purge !== "function")
					return new Response(null, { status: 204 });
				const result = await cache.purge({ tags: ["evame-reader"] });
				return new Response(null, { status: result.success ? 204 : 503 });
			}
			const state = new FetchState(request);
			const asset = await cf(state, env, context);
			if (asset) return asset;
			return finalize(state, await astro(state));
		},
	},
);
