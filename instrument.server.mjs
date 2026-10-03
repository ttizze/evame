import * as Sentry from "@sentry/tanstackstart-react";

if (process.env.NODE_ENV === "production") {
	Sentry.init({
		dsn: "https://0cda4c09dab97bb05116614428effb0c@o4507906314207232.ingest.us.sentry.io/4508805630263296",
		tracesSampleRate: 0.2,
		integrations: [
			Sentry.postgresIntegration(),
			Sentry.extraErrorDataIntegration(),
		],
		enableLogs: true,
		debug: false,
	});
}
