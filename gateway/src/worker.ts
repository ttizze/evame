import type { ExecutionContext } from "@cloudflare/workers-types";
import { withSecurityHeaders } from "../../security-headers";
import { fetchWorker } from "../../shared/fetch-worker";
import { fetchPublicReader } from "../../shared/public-reader";

export default {
	async fetch(
		request: Request,
		env: typeof import("cloudflare:workers").env,
		context: Pick<ExecutionContext, "waitUntil">,
	) {
		try {
			if (env.DATABASE_MIGRATION === "true")
				return withSecurityHeaders(
					new Response(null, { status: 503, headers: { "Retry-After": "60" } }),
				);
			const response = await fetchPublicReader(
				request,
				env.READER ?? null,
				env.SETTINGS,
				env.PREVIEW_READER_ORIGIN ?? null,
				env.PREVIEW_READER_SECRET ?? null,
			);
			if (response) return response;
			return withSecurityHeaders(
				await fetchWorker(
					request,
					env.APP ?? null,
					env.PREVIEW_APP_ORIGIN ?? null,
					env.PREVIEW_READER_SECRET ?? null,
				),
			);
		} catch (error) {
			console.error(error);
			if (!env.PREVIEW_APP_ORIGIN)
				context.waitUntil(
					env.MONITORING.report(
						error instanceof Error ? error : new Error(String(error)),
						request.url,
						request.method,
					).catch(console.error),
				);
			throw error;
		}
	},
};
