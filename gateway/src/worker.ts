import type { ExecutionContext } from "@cloudflare/workers-types";
import { withSecurityHeaders } from "../../security-headers";
import { fetchWorker } from "../../shared/fetch-worker";
import { getMigrationResponse } from "../../shared/migration-response";
import { fetchPublicReader } from "../../shared/public-reader";

export default {
	async fetch(
		request: Request,
		env: typeof import("cloudflare:workers").env,
		context: Pick<ExecutionContext, "waitUntil">,
	) {
		try {
			const migration = getMigrationResponse(env.DATABASE_MIGRATION);
			if (migration) return migration;
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
			if (!env.PREVIEW_APP_ORIGIN) {
				const url = new URL(request.url);
				context.waitUntil(
					env.MONITORING.report(
						error instanceof Error ? error : new Error(String(error)),
						`${url.origin}${url.pathname}`,
						request.method,
					).catch(console.error),
				);
			}
			throw error;
		}
	},
};
