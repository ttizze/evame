import * as Sentry from "@sentry/react";
import { SENTRY_DSN } from "./_utils/sentry-dsn";

if (process.env.NODE_ENV === "production") {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN ?? SENTRY_DSN,
		integrations: [
			Sentry.replayIntegration(),
			Sentry.browserProfilingIntegration(),
		],
		tracesSampleRate: 0.2,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		debug: false,
		tunnel: "/monitoring",
	});
}
