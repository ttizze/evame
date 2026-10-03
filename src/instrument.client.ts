import * as Sentry from "@sentry/tanstackstart-react";

if (process.env.NODE_ENV === "production") {
	Sentry.init({
		dsn: "https://0cda4c09dab97bb05116614428effb0c@o4507906314207232.ingest.us.sentry.io/4508805630263296",
		integrations: [
			Sentry.replayIntegration(),
			Sentry.browserProfilingIntegration(),
		],
		tracesSampleRate: 0.2,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		debug: false,
	});
}
