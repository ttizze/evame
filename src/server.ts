import type { ExecutionContext } from "@cloudflare/workers-types";
import { captureException, withSentry } from "@sentry/cloudflare";
import { isRedirect } from "@tanstack/react-router";
import handler from "@tanstack/react-start/server-entry";
import { securityHeaders } from "../security-headers";
import { SENTRY_DSN } from "./_utils/sentry-dsn";
import { createDb, databaseScope } from "./db";

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
			_env: typeof import("cloudflare:workers").env,
			context: Pick<ExecutionContext, "waitUntil">,
		) {
			const database = createDb();
			return databaseScope.run(database, async () => {
				try {
					const response = await handler.fetch(request);
					const headers = new Headers(response.headers);
					for (const [name, value] of Object.entries(securityHeaders))
						headers.set(name, value);
					const init = {
						status: response.status,
						statusText: response.statusText,
						headers,
					};
					if (!response.body) {
						await database.destroy();
						return new Response(null, init);
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
					return new Response(stream.readable, init);
				} catch (error) {
					await database.destroy();
					throw error;
				}
			});
		},
	},
);
