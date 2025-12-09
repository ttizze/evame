// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { createClient } from "@libsql/client/web";
import * as Sentry from "@sentry/nextjs";
import { libsqlIntegration } from "sentry-integration-libsql-client";

const libsqlClient = createClient({
	url: process.env.TURSO_CONNECTION_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN!,
});
if (process.env.NODE_ENV === "production") {
	Sentry.init({
		dsn: "https://0cda4c09dab97bb05116614428effb0c@o4507906314207232.ingest.us.sentry.io/4508805630263296",

		// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
		tracesSampleRate: 0.2,
		integrations: [
			libsqlIntegration(libsqlClient, Sentry),
			Sentry.extraErrorDataIntegration(),
		],
		// Setting this option to true will print useful information to the console while you're setting up Sentry.
		debug: false,
	});
}
